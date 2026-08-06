export const _0x4d2a = "IERpcmVpdG9zIGF1dG9yYWlzIKkgUm9uYWxkbyBCb3JiYQ==";
export const _0x1f8b = "cm9uYWxkb0Byb25hbGRvYm9yYmEuY29tLmJy";
export const _0x8e5c = "Um9uYWxkbyBCb3JiYQ==";

export const getOwnerName = () => {
    try {
        return atob(_0x8e5c);
    } catch (e) {
        return "System Owner";
    }
};

export const getSystemInfo = () => {
    try {
        return {
            label: atob(_0x4d2a),
            contact: atob(_0x1f8b)
        };
    } catch (e) {
        return {
            label: "System Info",
            contact: "Contact Support"
        };
    }
};
