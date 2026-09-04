import { AppError } from '@/core/app-error';
import { reportError, reportThrown, setErrorSink } from '@/core/reporting';

afterEach(() => setErrorSink(null));

describe('reportError', () => {
  it('forwards the code and scope to the installed sink', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = jest.fn();
    setErrorSink(sink);

    reportError({ scope: 'todos', code: '42501' });

    expect(sink).toHaveBeenCalledWith({ scope: 'todos', code: '42501' });
    warn.mockRestore();
  });

  it('never lets a broken sink become the error the user sees', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setErrorSink(() => {
      throw new Error('reporter is down');
    });

    expect(() => reportError({ scope: 'todos', code: '42501' })).not.toThrow();
    warn.mockRestore();
  });

  it('is a no-op with no sink installed', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => reportError({ scope: 'todos', code: 'XX999' })).not.toThrow();
    warn.mockRestore();
  });
});

describe('reportThrown', () => {
  it('keeps an AppError code', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = jest.fn();
    setErrorSink(sink);

    reportThrown('render:root', new AppError('denied', '42501'));

    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ code: '42501' }));
    warn.mockRestore();
  });

  it('labels a plain render throw', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = jest.fn();
    setErrorSink(sink);

    reportThrown('render:root', new TypeError('undefined is not an object'));

    expect(sink).toHaveBeenCalledWith({
      scope: 'render:root',
      code: 'render_error',
      context: { name: 'TypeError' },
    });
    warn.mockRestore();
  });

  it('does not put the developer message in the report', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sink = jest.fn();
    setErrorSink(sink);

    reportThrown('render:root', new Error('column "secret" does not exist'));

    expect(JSON.stringify(sink.mock.calls)).not.toContain('secret');
    warn.mockRestore();
  });
});
