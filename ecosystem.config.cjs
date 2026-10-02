module.exports = {
  apps: [3301, 3302].map((port, index) => ({
    name: `elsewhere-${index + 1}`,
    cwd: "/root/elsewhere",
    script: "node_modules/next/dist/bin/next",
    args: `start --hostname 127.0.0.1 --port ${port}`,
    env: {
      NODE_ENV: "production",
      ELSEWHERE_PUBLIC_ORIGIN: "https://elsewhere.sainiamit.com",
      ELSEWHERE_DB_PATH: "/root/elsewhere-data/waitlist.sqlite",
    },
    max_memory_restart: "350M",
    autorestart: true,
  })),
};
