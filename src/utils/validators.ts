export const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^(\+?51)?9\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isEmpty = (value: any): boolean => {
    return (
        value === undefined ||
        value === null ||
        (typeof value === 'object' && Object.keys(value).length === 0) ||
        (typeof value === 'string' && value.trim().length === 0)
    );
};
