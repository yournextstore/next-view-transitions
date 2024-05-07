import * as react_jsx_runtime from 'react/jsx-runtime';
import NextLink from 'next/link';

declare function Link(props: React.ComponentProps<typeof NextLink>): react_jsx_runtime.JSX.Element;

declare function ViewTransitions({ children, }: Readonly<{
    children: React.ReactNode;
}>): react_jsx_runtime.JSX.Element;

export { Link, ViewTransitions };
