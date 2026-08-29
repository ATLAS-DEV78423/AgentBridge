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

export function getOutputFormat(): OutputFormat {
  return format;
}

export function output(result: CommandResult): void {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  }
}

export function outputError(message: string, command: string): never {
  if (format === 'json') {
    console.log(JSON.stringify({ success: false, command, data: null, error: message }, null, 2));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
