import { BufReader } from "https://deno.land/std@0.63.0/io/mod.ts";

import { task, exec, log, utils, semver} from "./deps.ts";
import { TaskContext, file } from "../dnit.ts";

const tagPrefix = "dnit-v";

async function get_latest_tag() {
  const describeStr = await utils.run(['git','describe','--tags','--match',`${tagPrefix}*`,'--abbrev=0'],{stdout:'piped'});
  const find = new RegExp(`${tagPrefix}(.*)`);
  return describeStr.stdout.trim().replace(find,"$1");
}

async function git_last_commit_message() : Promise<string> {
  const gitLogCmd = await utils.run(['git','log','--pretty=oneline','--abbrev-commit','-1'],{stdout:'piped'});
  return gitLogCmd.stdout;
}

async function git_is_clean() {
  const gitStatusCmd = await utils.run(['git','status','--porcelain'],{stdout:'piped',stderr:'null'});
  return gitStatusCmd.stdout.length===0;
}

async function confirmation(msg: string, defValue: boolean, source: Deno.Reader = Deno.stdin) {
  console.log(`${msg} (${defValue ? "Y/n" : "y/N"}):`);

  const br = new BufReader(source);
  const resp = await br.readString("\n");
  if (resp === null) {
    return defValue;
  }
  return resp.startsWith('Y')||resp.startsWith('y');
}

const fetchTags = task({
  name: "fetch-tags",
  description:"Git remote fetch tags",
  action: async() => {
    log.info("Fetch tags");
    await utils.run(['git','fetch','--tags'], {stdout:'null'});
  },
  uptodate: ()=>false
})

const requireCleanGit = task({
  name: "git-is-clean",
  description:"Check git status is clean",
  action: async(ctx: TaskContext) => {

    type Args = {
      "ignore-unclean"?: true;
    };
    const args : Args = ctx.args as Args;
    if(args["ignore-unclean"]) {
      return;
    }
    if(!await git_is_clean()) {
      throw new Error("Unclean git status");
    }
  },
  uptodate: ()=>false
})

const tag = task({
  name: "tag",
  description: "Run git tag",
  action: async (ctx: TaskContext) => {
    const current = await get_latest_tag();

    type Args = {
      "major"?: true;
      "minor"?: true;
      "patch"?: true;
      "message"?: string;
      "origin"?:string;
      "dry-run"?:true;
    };
    const args : Args = ctx.args as Args;
    const increment : "major"|"minor"|"patch" = args.major ? "major" : (args.minor ? "minor" : ("patch"));
    const next = semver.inc(current,increment);

    const tagMessage =  args.message || `Tag ${increment} to ${next}`;
    const tagName = `${tagPrefix}${next}`;
    const dryRun = args["dry-run"] || false;

    const origin =  args.origin || `origin`;

    const gitLastCommit = await git_last_commit_message();
    console.log('Last commit: ' + gitLastCommit);

    const conf = await confirmation(`Git tag and push ${tagMessage} tagName?`, false);
    if(conf) {
      const cmds = dryRun ? ['echo'] : [];

      await utils.run(cmds.concat(['git','tag','-a','-m',tagMessage,tagName]));
      await utils.run(cmds.concat(['git','push',origin,tagName]))
      log.info(`${dryRun ? "(dry-run) " : ""}Git tagged and pushed ${tagPrefix}${next}`);
    } else {
      throw new Error("Aborted");
    }

    if(dryRun) {
      throw new Error("Dry run");
    }
  },
  deps: [
    requireCleanGit,
    fetchTags
  ],
  uptodate: ()=>false
});

const push = task({
  name: "push",
  description: "Run git push",
  action: () => {

  },
  uptodate: ()=>false
});

const genadl = task({
  name: 'genadl',
  description: 'Code generate from ADL definition',
  action: async ()=> {
    await utils.run(['./tools/gen-adl.sh']);
    await utils.run(['git','apply','./tools/0001-Revert-non-desired-gen-adl-edits.patch']);
  },
  targets: [
    file({path:'./adl-gen/dnit/manifest.ts'}),
  ],
  deps: [
    file({path:'./adl/manifest.adl'}),
    file({path:'./tools/0001-Revert-non-desired-gen-adl-edits.patch'}),
  ]
});

const tasks = [
  genadl,
  tag,
  push
];

exec(Deno.args, tasks)
.then(result=>{
  if(!result.success) {
    Deno.exit(1);
  }
});
