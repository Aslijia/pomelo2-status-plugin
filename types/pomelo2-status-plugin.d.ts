

export interface StatusService {
    clean(cb: Function);

    add(uid: string, sid: string, cb: Function);
    leave(uid: string, sid: string, cb: Function);
    getSidsByUid(uid: string, cb: Function);
    getSidsByUids(uids: string[], cb: Function);
}