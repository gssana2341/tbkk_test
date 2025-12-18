declare module "fft-js" {
  export function fft(signal: number[]): [number, number][];
  export function ifft(spectrum: [number, number][]): number[];
}
