import {run} from './process.ts';
import {task, TaskContext} from '../dnit.ts';

export async function git_latest_tag(tagPrefix: string) {
  const describeStr = await run(['git','describe','--tags','--match',`${tagPrefix}*`,'--abbrev=0'],{stdout:'piped'});
  const find = new RegExp(`${tagPrefix}(.*)`);
  return describeStr.stdout.trim().replace(find,"$1");
}

export async function git_last_commit_message() : Promise<string> {
  const gitLogCmd = await run(['git','log','--pretty=oneline','--abbrev-commit','-1'],{stdout:'piped'});
  return gitLogCmd.stdout;
}

export async function git_is_clean() {
  const gitStatusCmd = await run(['git','status','--porcelain'],{stdout:'piped',stderr:'null'});
  return gitStatusCmd.stdout.length===0;
}

export const fetchTags = task({
  name: "fetch-tags",
  description:"Git remote fetch tags",
  action: async() => {
    await run(['git','fetch','--tags'], {stdout:'null'});
  },
  uptodate: ()=>false
});

export const requireCleanGit = task({
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
});

