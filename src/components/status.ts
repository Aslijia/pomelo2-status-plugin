import { StatusService } from "../service/statusService";

module.exports = function (app, opts) {
  const service = new StatusService(app, opts);
  app.set('statusService', service, true);
  ///@ts-ignore
  service.name = '__status__';
  return service;
};