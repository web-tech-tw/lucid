import ky from "ky"

const {
    VITE_SARA_RECV_HOST: baseUrl,
    VITE_SARA_TOKEN_NAME: tokenName,
} = import.meta.env;

const useSaraToken = (request) => {
    const tokenValue = localStorage.getItem(tokenName);
    if (!tokenValue) return;
    request.headers.set('authorization', `SARA ${tokenValue}`);
};

const renewSaraToken = (_request, _options, response) => {
    const tokenValue = response.headers.get('sara-issue');
    if (!tokenValue) return;
    localStorage.setItem(tokenName, tokenValue);
};

const revokeSaraToken = (_request, _options, response) => {
    const tokenStatus = response.status;
    if (tokenStatus !== 401) return;
    localStorage.removeItem(tokenName);
};

const client = ky.create({
    prefixUrl: baseUrl,
    hooks: {
        beforeRequest: [
            useSaraToken,
        ],
        afterResponse: [
            renewSaraToken,
            revokeSaraToken,
        ],
    }
});

export const useClient = () => client;
