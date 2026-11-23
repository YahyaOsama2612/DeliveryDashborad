/**
 * getErrorMessage — always returns a plain string from any API/axios error.
 * Backends often send `error` or `message` as an object or array; rendering
 * that in JSX (or passing it to toast) crashes React and blanks the page.
 */
const toText = (value) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        if (value.message) return toText(value.message);
        return Object.values(value).map(toText).filter(Boolean).join(', ');
    }
    return String(value);
};

const getErrorMessage = (
    err,
    fallback = 'Something went wrong. Please try again.'
) => {
    const data = err?.response?.data;
    return (
        toText(data?.message) ||
        toText(data?.error) ||
        toText(data?.data?.message) ||
        toText(err?.message) ||
        fallback
    );
};

export default getErrorMessage;