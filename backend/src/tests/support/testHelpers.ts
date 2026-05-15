import type { Request, Response } from 'express';

// Mock Express Request
export const mockRequest = (options: any = {}): Request => {
    return {
        body: {},
        query: {},
        params: {},
        user: undefined,
        ...options
    } as unknown as Request;
};

// Mock Express Response
export const mockResponse = () => {
    const res: any = { statusCode: 200 };
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.jsonData = data;
        return res;
    };
    res.send = (data: any) => {
        res.sendData = data;
        return res;
    };
    return res as Response & { statusCode: number; jsonData: any; sendData: any };
};

// Simple object monkey-patching stub framework
const stubStore = new Map<any, { original: any, stubs: Record<string, any> }>();

export const stub = (obj: any, method: string, override: Function) => {
    if (!stubStore.has(obj)) {
        stubStore.set(obj, { original: { ...obj }, stubs: {} });
    }
    const store = stubStore.get(obj)!;
    if (store.original[method] === undefined) {
        store.original[method] = obj[method];
    }
    obj[method] = override;
    store.stubs[method] = override;
};

export const restoreAllStubs = () => {
    for (const [obj, store] of stubStore.entries()) {
        for (const method in store.stubs) {
            obj[method] = store.original[method];
        }
    }
    stubStore.clear();
};
