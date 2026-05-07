function resolveActorId(req) {
  if (!req) {
    console.warn('[identityHelper] resolveActorId called without a request object');
    return null;
  }

  const actorId = req.actorId ?? req.userId ?? req.employeeHubId ?? null;

  if (!actorId) {
    console.warn('[identityHelper] Unable to resolve actor id from req.actorId, req.userId, or req.employeeHubId', {
      method: req.method,
      path: req.originalUrl || req.url
    });
  }

  return actorId;
}

module.exports = { resolveActorId };