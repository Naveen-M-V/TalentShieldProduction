module.exports = {
  apps: [
    {
      name: "hrms-backend",
      script: "./server.js",
      cwd: "/home/pentest/apps/hrms/backend",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}


