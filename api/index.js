import { safeApiHandler } from '../debug/fixed-api-handler.js';

export default async function handler(req, res) {
  return safeApiHandler(req, res);
}
