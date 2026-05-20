import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';

export default function () {
  const gamesRes = http.get(`${BASE_URL}/games`);
  check(gamesRes, { 'games status 200': (r) => r.status === 200 });

  const lbRes = http.get(`${BASE_URL}/leaderboard/global`);
  check(lbRes, { 'leaderboard status 200': (r) => r.status === 200 });

  sleep(1);
}
