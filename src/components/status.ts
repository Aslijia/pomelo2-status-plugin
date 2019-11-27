import { StatusService } from "../service/statusService";

declare interface Application {
  get(key: string): any;
  set(...args: any[]): any;
}

module.exports = function (app: Application, opts: any) {
  const service = new StatusService(app, opts);
  app.set('statusService', service, true);
  ///@ts-ignore
  service.name = '__status__';
  return service;
};