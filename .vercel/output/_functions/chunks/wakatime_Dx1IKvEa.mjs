const prerender = false;
const GET = async () => {
  {
    const body = JSON.stringify({ ok: false, error: "missing WAKATIME_API_KEY" });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
