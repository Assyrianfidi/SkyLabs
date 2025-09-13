module.exports = {
  apps: [{
    name: 'skylabs',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1024',
    },
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true,
  }],
};
