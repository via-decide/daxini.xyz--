export default async function handler(req, res) {
  try {
    console.log("REQUEST:", req.method, req.url);
    console.log("DAXINI API HIT");

    if (req.method === "GET") {
      return res.status(200).json({
        status: "ok",
        service: "daxini",
        timestamp: Date.now()
      });
    }

    return res.status(405).json({
      error: "method_not_allowed"
    });

  } catch (err) {
    console.error("CRASH:", err);

    return res.status(500).json({
      error: "internal_error",
      message: err.message
    });
  }
}
