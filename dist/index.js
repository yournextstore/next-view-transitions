'use client';
import { jsx } from 'react/jsx-runtime';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useSyncExternalStore, use, useEffect, useState, createContext, useCallback, startTransition } from 'react';

// TODO: This implementation might not be complete when there are nested
// Suspense boundaries during a route transition. But it should work fine for
// the most common use cases.
// This is a global variable to keep track of the view transition state.
let currentViewTransition = null;
function useBrowserNativeTransitions() {
    const pathname = usePathname();
    const currentPathname = useRef(pathname);
    const transition = useSyncExternalStore((callback)=>{
        if (!('startViewTransition' in document)) {
            return ()=>{};
        }
        const onPopState = ()=>{
            let pendingViewTransitionResolve;
            const pendingViewTransition = new Promise((resolve)=>{
                pendingViewTransitionResolve = resolve;
            });
            const pendingStartViewTransition = new Promise((resolve)=>{
                // @ts-ignore
                document.startViewTransition(()=>{
                    resolve();
                    return pendingViewTransition;
                });
            });
            currentViewTransition = [
                pendingStartViewTransition,
                pendingViewTransitionResolve
            ];
            callback();
        };
        window.addEventListener('popstate', onPopState);
        return ()=>{
        // TODO: Intentionally not cleaning up the event listener, otherwise the
        // listener won't be registered again. This might be something related
        // to the `use` call. We should investigate this further.
        };
    }, ()=>currentViewTransition, ()=>null);
    if (transition && currentPathname.current !== pathname) {
        // Whenever the pathname changes, we block the rendering of the new route
        // until the view transition is started (i.e. DOM screenshotted).
        use(transition[0]);
    }
    // Keep the transition reference up-to-date.
    const transitionRef = useRef(transition);
    useEffect(()=>{
        transitionRef.current = transition;
    }, [
        transition
    ]);
    useEffect(()=>{
        // When the new route component is actually mounted, we finish the view
        // transition.
        currentPathname.current = pathname;
        if (transitionRef.current) {
            transitionRef.current[1]();
            transitionRef.current = null;
        }
    }, [
        pathname
    ]);
}

const ViewTransitionsContext = /*#__PURE__*/ createContext(()=>()=>{});
function ViewTransitions({ children }) {
    const [finishViewTransition, setFinishViewTransition] = useState(null);
    useEffect(()=>{
        if (finishViewTransition) {
            finishViewTransition();
            setFinishViewTransition(null);
        }
    }, [
        finishViewTransition
    ]);
    useBrowserNativeTransitions();
    return /*#__PURE__*/ jsx(ViewTransitionsContext.Provider, {
        value: setFinishViewTransition,
        children: children
    });
}
function useSetFinishViewTransition() {
    return use(ViewTransitionsContext);
}

function _extends() {
    _extends = Object.assign || function(target) {
        for(var i = 1; i < arguments.length; i++){
            var source = arguments[i];
            for(var key in source){
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };
    return _extends.apply(this, arguments);
}
// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L180-L191
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute('target');
    return target && target !== '_self' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || // triggers resource download
    event.nativeEvent && event.nativeEvent.which === 2;
}
// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L204-L217
function shouldPreserveDefault(e) {
    const { nodeName } = e.currentTarget;
    // anchors inside an svg have a lowercase nodeName
    const isAnchorNodeName = nodeName.toUpperCase() === 'A';
    if (isAnchorNodeName && isModifiedEvent(e)) {
        // ignore click for browser’s default behavior
        return true;
    }
    return false;
}
// This is a wrapper around next/link that explicitly uses the router APIs
// to navigate, and trigger a view transition.
function Link(props) {
    const router = useRouter();
    const finishViewTransition = useSetFinishViewTransition();
    const { href, as, replace, scroll } = props;
    const onClick = useCallback((e)=>{
        if (props.onClick) {
            props.onClick(e);
        }
        if ('startViewTransition' in document) {
            if (shouldPreserveDefault(e)) {
                return;
            }
            e.preventDefault();
            // @ts-ignore
            document.startViewTransition(()=>new Promise((resolve)=>{
                    startTransition(()=>{
                        // copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L231-L233
                        router[replace ? 'replace' : 'push'](as || href, {
                            scroll: scroll != null ? scroll : true
                        });
                        finishViewTransition(()=>resolve);
                    });
                }));
        }
    }, [
        props.onClick,
        href,
        as,
        replace,
        scroll
    ]);
    return /*#__PURE__*/ jsx(NextLink, _extends({}, props, {
        onClick: onClick
    }));
}

export { Link, ViewTransitions };
