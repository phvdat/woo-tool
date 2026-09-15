import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

export async function getGoogleTrends() {
  try {
    const { stdout, stderr } = await exec(
      "python/.venv/bin/python3",
      ["python/google_trends.py"]
    );

    if (stderr) {
      console.error(`[TRENDS] ${stderr}`);
    }

    return JSON.parse(stdout);
  } catch (err: any) {
    console.error(`[TRENDS] Python error: ${err.stderr || err.stdout || err.message || 'Unknown error'}`);
    throw err;
  }
}