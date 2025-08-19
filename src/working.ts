#!/usr/bin/env node
import { logEvent } from "./utils.js";
import { setTerminalStatus } from "./status-manager.js";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("readable", () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on("end", async () => {
  try {
    const data = JSON.parse(input);

    // Log the working event
    logEvent("working", data);

    // Set terminal status to animated working state
    const task = data.task || data.tool || data.action || "Working";
    setTerminalStatus("working", `${task}...`);

    process.exit(0);
  } catch (error) {
    console.error("Error processing working state:", error);
    process.exit(2);
  }
});