// 시트와 주고받는 함수들. 서버 쪽 설명은 apps-script/Code.gs 참고.
import { API_URL } from './config.js';

const TIMEOUT_MS = 20000;

async function call(params, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = body
      ? await fetch(API_URL, {
          method: 'POST',
          // text/plain으로 보내야 브라우저의 사전 확인(CORS preflight) 없이 Apps Script에 바로 닿아요
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        })
      : await fetch(API_URL + '?' + new URLSearchParams(params), { signal: ctrl.signal });
  } catch (e) {
    throw apiError('network', '인터넷 연결을 확인해 주세요.');
  } finally {
    clearTimeout(timer);
  }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw apiError('bad_response', '서버 응답을 읽지 못했어요.');
  }
  if (!json.ok) throw apiError(json.error, json.message, json);
  return json;
}

function apiError(code, message, data) {
  const e = new Error(message);
  e.code = code;
  e.data = data;
  return e;
}

export const api = {
  ping: () => call({ action: 'ping' }),
  trips: (codes) => call({ action: 'trips', codes: codes.join(',') }),
  load: (code) => call({ action: 'load', code }),
  createTrip: (body) => call(null, { action: 'create_trip', ...body }),
  save: (body) => call(null, { action: 'save', ...body }),
  remove: (body) => call(null, { action: 'delete', ...body }),
  restore: (body) => call(null, { action: 'restore', ...body }),
  toggleDone: (body) => call(null, { action: 'toggle_done', ...body }),
  reorder: (body) => call(null, { action: 'reorder', ...body }),
  upload: (body) => call(null, { action: 'upload', ...body }),
};
