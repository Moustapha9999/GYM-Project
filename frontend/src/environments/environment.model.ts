export interface Environment {
  production: boolean;
  appName: string;
  apiUrl: string;
  devLogin?: {
    email: string;
    password: string;
  };
}
