import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
    });
  }

  private extractMessage(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) return 'Internal server error';

    const response = exception.getResponse();
    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response !== null) {
      const r = response as Record<string, unknown>;
      const msg = r['message'];
      if (Array.isArray(msg)) return msg as string[];
      if (typeof msg === 'string') return msg;
    }

    return exception.message;
  }
}
