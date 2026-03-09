import type { Request, Response } from 'express';
export declare const getProviders: (req: Request, res: Response) => Promise<void>;
export declare const createProvider: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getManageableVehicles: (req: Request, res: Response) => Promise<void>;
export declare const addVehicle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateVehicle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeVehicle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=providerController.d.ts.map