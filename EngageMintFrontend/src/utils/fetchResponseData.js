const API_BASE =

  import.meta.env.VITE_API_BASE_URL ||

  "https://us-central1-macengage2026.cloudfunctions.net/api";



async function parseApiResponse(response) {

  const payload = await response.json();

  if (!response.ok || payload?.ok === false) {

    throw new Error(payload?.message || "Request failed");

  }

  return payload;

}



export async function getLiveData(deviceId = "handwashpi") {

  const response = await fetch(`${API_BASE}/live/current?deviceId=${encodeURIComponent(deviceId)}`, {

    headers: {

      "Content-Type": "application/json",

    },

  });



  return parseApiResponse(response);

}



export async function getAllSessionInfo(userId) {

  if (!userId) {

    throw new Error("userId is required");

  }



  const response = await fetch(`${API_BASE}/getAllSessionInfo/${encodeURIComponent(userId)}`, {

    headers: {

      "Content-Type": "application/json",

    },

  });



  return parseApiResponse(response);

}



export async function getSessionInfo(sessionId) {

  if (!sessionId) {

    throw new Error("sessionId is required");

  }



  const response = await fetch(`${API_BASE}/sessionInfo/${encodeURIComponent(sessionId)}`, {

    headers: {

      "Content-Type": "application/json",

    },

  });



  return parseApiResponse(response);

}



export async function getSessionLiveData(sessionId, limit = 200) {

  if (!sessionId) {

    throw new Error("sessionId is required");

  }



  const query = new URLSearchParams({

    sessionId,

    limit: String(limit),

  });



  const response = await fetch(`${API_BASE}/live?${query.toString()}`, {

    headers: {

      "Content-Type": "application/json",

    },

  });



  return parseApiResponse(response);

}