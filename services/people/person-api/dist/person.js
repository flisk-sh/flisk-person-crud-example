/** Validates a request body; returns the cleaned person or an error message. */
export function parsePerson(body) {
    const { name, email, age } = (body ?? {});
    if (typeof name !== "string" || name.trim() === "")
        return "name is required";
    if (typeof email !== "string" || !email.includes("@"))
        return "a valid email is required";
    if (age !== undefined &&
        (typeof age !== "number" || !Number.isFinite(age) || age < 0)) {
        return "age must be a positive number";
    }
    return {
        name: name.trim(),
        email: email.trim(),
        ...(age === undefined ? {} : { age }),
    };
}
//# sourceMappingURL=person.js.map