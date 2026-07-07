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
      console.error(stderr);
    }

    return JSON.parse(stdout);
  } catch (err: any) {
    console.error("Python stdout:", err.stdout);
    console.error("Python stderr:", err.stderr);
    throw err;
  }
}