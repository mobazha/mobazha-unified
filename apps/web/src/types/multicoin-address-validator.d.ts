interface AddressValidatorModule {
  isValidAddress(address: string, config?: unknown, options?: unknown): boolean;
}

declare module 'multicoin-address-validator/src/bitcoin_validator' {
  const validator: AddressValidatorModule;
  export default validator;
}

declare module 'multicoin-address-validator/src/bch_validator' {
  const validator: AddressValidatorModule;
  export default validator;
}

declare module 'multicoin-address-validator/src/base58_validator' {
  const validator: AddressValidatorModule;
  export default validator;
}

declare module 'multicoin-address-validator/src/tron_validator' {
  const validator: AddressValidatorModule;
  export default validator;
}
