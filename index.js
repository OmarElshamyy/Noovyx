const ngrok = require("@ngrok/ngrok");

async function forwardToApp() {
  const addr = process.env.PORT || "localhost:3000";
  const domain = process.env.NGROK_DOMAIN || undefined;
  const forwarder = await ngrok.forward({
    addr,
    authtoken_from_env: true,
    ...(domain ? { domain } : {}),
  });
  console.log(`Available at: ${forwarder.url()}`);
}

forwardToApp();
