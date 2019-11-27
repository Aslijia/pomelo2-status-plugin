

export interface StatusService {
    clean(cb: Function);

    add(uid: string, sid: string): Promise<any>;
    leave(uid: string, sid: string): Promise<any>;
    getSidsByUid(uid: string): Promise<string[]>;
    getFrontendIdsByUid(uid: string): Promise<string[]>;
    getStatusByUid(uid: string): Promise<boolean>;
    pushByUids(uids: string[], route: string, msg: any): Promise<any>;
}