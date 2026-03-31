declare module 'multicoin-address-validator' {
  type NetworkType = 'prod' | 'testnet' | 'both';

  interface WalletAddressValidator {
    validate(address: string, currencyNameOrSymbol: string, networkType?: NetworkType): boolean;
  }

  const WAValidator: WalletAddressValidator;
  export default WAValidator;
}
