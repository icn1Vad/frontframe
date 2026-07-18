// ContiNew Admin 的账号登录契约使用该公钥执行 PKCS#1 v1.5 加密。
const CONTINEW_RSA_PUBLIC_KEY =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM51dgYtMyF+tTQt80sfFOpSV27a7t9u" +
  "aUVeFrdGiVxscuizE7H8SMntYqfn9lp8a5GH5P1/GGehVjUD2gF/4kcCAwEAAQ==";

interface JSEncryptInstance {
  setPublicKey(publicKey: string): void;
  encrypt(value: string): string | false;
}

type JSEncryptConstructor = new () => JSEncryptInstance;

interface JSEncryptModule {
  JSEncrypt?: JSEncryptConstructor;
  default?: JSEncryptConstructor | { JSEncrypt?: JSEncryptConstructor };
}

export async function encryptContinewPassword(password: string): Promise<string> {
  // jsencrypt 在模块初始化时读取 window，仅在用户提交登录表单后加载。
  const loadedModule = await import("jsencrypt") as unknown as JSEncryptModule;
  const defaultExport = loadedModule.default;
  const Encryptor = loadedModule.JSEncrypt ?? (
    typeof defaultExport === "function"
      ? defaultExport
      : defaultExport?.JSEncrypt
  );

  if (!Encryptor) {
    throw new Error("登录密码加密组件加载失败，请刷新页面后重试。");
  }

  const encryptor = new Encryptor();
  encryptor.setPublicKey(CONTINEW_RSA_PUBLIC_KEY);
  const encryptedPassword = encryptor.encrypt(password);

  if (!encryptedPassword) {
    throw new Error("登录密码加密失败，请刷新页面后重试。");
  }

  return encryptedPassword;
}
