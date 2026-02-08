const API_BASE = "https://us-central1-macengage2026.cloudfunctions.net/api";

async function parseApiResponse(response) {
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || "Request failed");
  }
  return payload;
}

export async function writeComment(sessionId, comments) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const response = await fetch(`${API_BASE}/sessionInfo/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comments }),
  });

  return parseApiResponse(response);
}

export async function updateSessionInfo(sessionId, updates) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const response = await fetch(`${API_BASE}/sessionInfo/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  return parseApiResponse(response);
}

export async function linkDeviceOwner(userId, deviceId = "handwashpi") {
  if (!userId) {
    throw new Error("userId is required");
  }

  const response = await fetch(
    `${API_BASE}/devices/${encodeURIComponent(deviceId)}/owner`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    },
  );

  return parseApiResponse(response);
}

export async function startMachine(){
    try {
        const response = await fetch(`${API_BASE}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ "deviceId": "handwashpi" })
        })
        return parseApiResponse(response);
    } catch(err){
        console.log(err);
    }
}

export async function endMachine(){
    try {
        const response = await fetch(`${API_BASE}/end`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ "deviceId": "handwashpi" })
        })
        return parseApiResponse(response);
    } catch(err){
        console.log(err);
    }
}