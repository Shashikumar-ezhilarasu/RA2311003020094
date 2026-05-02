const token = process.env.EVAL_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJzZTI2NzlAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMDM1OCwiaWF0IjoxNzc3Njk5NDU4LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNmYwY2IyYjYtZmI0Mi00ZmUzLWFhZTktYWM0ZmQ1YTZhMGM2IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoic2hhc2hpa3VtYXIiLCJzdWIiOiI2MjY5ODVmMi1kMTk5LTRiODktOWM5Yy0yMWE4MTZjODYxODgifSwiZW1haWwiOiJzZTI2NzlAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJzaGFzaGlrdW1hciIsInJvbGxObyI6InJhMjMxMTAwMzAyMDA5NCIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjYyNjk4NWYyLWQxOTktNGI4OS05YzljLTIxYTgxNmM4NjE4OCIsImNsaWVudFNlY3JldCI6IkNjY2VTZVJyR0tacHlWbmUifQ.NG16kbdcNmkIkOkFk4kv9V8O7LNwWffFmSK_PVAUGUU";

async function Log(stack, level, pkgName, message) {
  if (!stack || !level || !pkgName) return;

  let s = stack.toLowerCase();
  let l = level.toLowerCase();
  let p = pkgName.toLowerCase();



  let okStacks = ["backend", "frontend"];
  let okLevels = ["debug", "info", "warn", "error", "fatal"];
  let okPkgs = ["repository", "route", "service", "auth", "config", "middleware", "utils"];


  
  if (!okStacks.includes(s)) return;
  if (!okLevels.includes(l)) return;
  if (s === "backend" && !okPkgs.includes(p)) return;

  let url = "http://20.207.122.201/evaluation-service/logs";
  
  let data = {
    stack: s,
    level: l,
    package: p,
    message: message
  };

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.log("log failed " + response.status);
    }
  } catch (e) {
    console.log("log error", e.message);
  }
}

module.exports = { Log };
