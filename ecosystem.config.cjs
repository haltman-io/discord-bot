module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      node_args: '--enable-source-maps',
      kill_timeout: 10000,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
  ],
};
