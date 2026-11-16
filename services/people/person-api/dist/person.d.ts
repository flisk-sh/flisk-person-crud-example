export interface Person {
    name: string;
    email: string;
    age?: number;
}
/** Validates a request body; returns the cleaned person or an error message. */
export declare function parsePerson(body: unknown): Person | string;
//# sourceMappingURL=person.d.ts.map