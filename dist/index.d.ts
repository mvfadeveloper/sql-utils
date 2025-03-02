export type Result<T, E = Error> = {
    success: true;
    value: T;
} | {
    success: false;
    error: E;
};
export interface InputData {
    [column: string]: string | string[] | number | boolean | null;
}
export declare class SqlUtils {
    private sql;
    constructor(connectionString: string);
    getSingleObj<T>(table: string, queryParam: string, queryValue: string | number | boolean): Promise<Result<T, string>>;
    getAllObjs<T>(table: string, options?: {
        queryParam?: string;
        queryValue?: string | number | boolean;
        limit?: number;
        order?: "ASC" | "DESC";
    }): Promise<Result<T, string>>;
    getAllObjsPaginated<T>(table: string, options?: {
        queryParam?: string;
        queryValue?: string | number | boolean;
        page?: number;
        pageSize?: number;
    }): Promise<Result<{
        data: T;
        total: number;
        pageCount: number;
    }, string>>;
    updateSingleColumn<T>(table: string, column: string, value: string | string[] | number | boolean | null, idQuery: number, idColumn?: string | undefined): Promise<Result<T, string>>;
    updateData<T>(table: string, updateData: InputData, idQuery: number, idColumn?: string): Promise<Result<T, string>>;
    deleteSingleRow(table: string, id: number): Promise<Result<void, string>>;
    insertData<T>(table: string, insertData: InputData): Promise<Result<T, string>>;
}
