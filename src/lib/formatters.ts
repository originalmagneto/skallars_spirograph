const isValidDate = (value: unknown) => {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value as string | number);
    return !Number.isNaN(date.getTime());
};

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value));

export const formatAdminDate = (value?: Date | string | number | null) => {
    if (!value || !isValidDate(value)) return "—";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(toDate(value));
};

export const formatAdminDateTime = (value?: Date | string | number | null) => {
    if (!value || !isValidDate(value)) return "—";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(toDate(value));
};
