import { main, task, trackFile } from "../../mod.ts";

// A simple task that creates a hello world message
const helloWorld = task({
  name: "hello",
  description: "Create a hello world message",
  action: async () => {
    await Deno.writeTextFile("hello.txt", "Hello, World!\n");
    console.log("Created hello.txt with greeting!");
  },
  targets: [
    trackFile({ path: "hello.txt" }),
  ],
});

// A task that reads and displays the message
const showMessage = task({
  name: "show",
  description: "Display the hello world message",
  action: async () => {
    const message = await Deno.readTextFile("hello.txt");
    console.log("Message contents:", message.trim());
  },
  deps: [
    trackFile({ path: "hello.txt" }),
  ],
});

// A task that cleans up
const cleanup = task({
  name: "cleanup",
  description: "Remove the hello.txt file",
  action: async () => {
    try {
      await Deno.remove("hello.txt");
      console.log("Cleaned up hello.txt");
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log("hello.txt already removed");
      } else {
        throw error;
      }
    }
  },
});

// Register tasks with dnit
main(Deno.args, [helloWorld, showMessage, cleanup]);
