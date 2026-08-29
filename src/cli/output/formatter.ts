export type OutputFormat = 'human' | 'json';

export type CommandResult = {
  success: boolean;
  command: string;
  data: unknown;
  error?: string;
};

let format: OutputFormat = 'human';

export function setOutputFormat(f: OutputFormat): void {
  format = f;
}

export function output(result: CommandResult): void {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  }
}
