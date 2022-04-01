
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var project = {
    	name: "The mewithoutYou “Farewell” tour [visualized]"
    };
    var projectConfig = {
    	project: project
    };

    /* src/Meta.svelte generated by Svelte v3.38.2 */
    const file$8 = "src/Meta.svelte";

    function create_fragment$8(ctx) {
    	let meta0;
    	let meta1;
    	let meta2;
    	let meta3;
    	let meta4;
    	let link;
    	let meta5;
    	let meta6;
    	let title_value;
    	document.title = title_value = projectConfig.project.name;

    	const block = {
    		c: function create() {
    			meta0 = element("meta");
    			meta1 = element("meta");
    			meta2 = element("meta");
    			meta3 = element("meta");
    			meta4 = element("meta");
    			link = element("link");
    			meta5 = element("meta");
    			meta6 = element("meta");
    			attr_dev(meta0, "charset", "utf-8");
    			add_location(meta0, file$8, 5, 2, 90);
    			attr_dev(meta1, "http-equiv", "X-UA-Compatible");
    			attr_dev(meta1, "content", "IE=edge");
    			add_location(meta1, file$8, 6, 2, 117);
    			attr_dev(meta2, "name", "viewport");
    			attr_dev(meta2, "content", "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no");
    			add_location(meta2, file$8, 7, 2, 175);
    			attr_dev(meta3, "property", "fullbleed");
    			attr_dev(meta3, "content", "false");
    			add_location(meta3, file$8, 11, 2, 310);
    			attr_dev(meta4, "property", "slug");
    			attr_dev(meta4, "content", projectConfig.project.slug);
    			add_location(meta4, file$8, 12, 2, 358);
    			attr_dev(link, "rel", "icon");
    			attr_dev(link, "type", "image/png");
    			attr_dev(link, "href", "https://static.axios.com/img/axiosvisuals-favicon-128x128.png");
    			attr_dev(link, "sizes", "128x128");
    			add_location(link, file$8, 13, 2, 422);
    			attr_dev(meta5, "property", "apple-fallback");
    			attr_dev(meta5, "content", `fallbacks/${projectConfig.project.slug}-apple.png`);
    			add_location(meta5, file$8, 19, 2, 564);
    			attr_dev(meta6, "property", "newsletter-fallback");
    			attr_dev(meta6, "content", `fallbacks/${projectConfig.project.slug}-fallback.png`);
    			add_location(meta6, file$8, 23, 2, 673);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, meta0);
    			append_dev(document.head, meta1);
    			append_dev(document.head, meta2);
    			append_dev(document.head, meta3);
    			append_dev(document.head, meta4);
    			append_dev(document.head, link);
    			append_dev(document.head, meta5);
    			append_dev(document.head, meta6);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*projectConfig*/ 0 && title_value !== (title_value = projectConfig.project.name)) {
    				document.title = title_value;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(meta0);
    			detach_dev(meta1);
    			detach_dev(meta2);
    			detach_dev(meta3);
    			detach_dev(meta4);
    			detach_dev(link);
    			detach_dev(meta5);
    			detach_dev(meta6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Meta", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Meta> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ projectConfig });
    	return [];
    }

    class Meta extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Meta",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.38.2 */

    const file$7 = "src/components/Header.svelte";

    function create_fragment$7(ctx) {
    	let header;
    	let div4;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div3;
    	let t6;
    	let span;
    	let t8;
    	let div5;
    	let t9;
    	let a0;
    	let t11;
    	let div6;
    	let a1;
    	let svg0;
    	let g;
    	let path0;
    	let t12;
    	let a2;
    	let svg1;
    	let path1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div4 = element("div");
    			div0 = element("div");
    			div0.textContent = "THE";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "mewithoutYou";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "“FAREWELL”";
    			t5 = space();
    			div3 = element("div");
    			t6 = text("TOUR ");
    			span = element("span");
    			span.textContent = "[visualized]";
    			t8 = space();
    			div5 = element("div");
    			t9 = text("A data visualization by ");
    			a0 = element("a");
    			a0.textContent = "Jared Whalen";
    			t11 = space();
    			div6 = element("div");
    			a1 = element("a");
    			svg0 = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			t12 = space();
    			a2 = element("a");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			attr_dev(div0, "class", "svelte-aqyfr4");
    			add_location(div0, file$7, 3, 2, 34);
    			attr_dev(div1, "class", "svelte-aqyfr4");
    			add_location(div1, file$7, 4, 2, 51);
    			attr_dev(div2, "class", "svelte-aqyfr4");
    			add_location(div2, file$7, 5, 2, 77);
    			attr_dev(span, "class", "svelte-aqyfr4");
    			add_location(span, file$7, 6, 12, 111);
    			attr_dev(div3, "class", "svelte-aqyfr4");
    			add_location(div3, file$7, 6, 2, 101);
    			attr_dev(div4, "class", "h-stack svelte-aqyfr4");
    			add_location(div4, file$7, 2, 0, 10);
    			attr_dev(a0, "href", "https://jaredwhalen.com/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "svelte-aqyfr4");
    			add_location(a0, file$7, 9, 44, 195);
    			attr_dev(div5, "class", "byline svelte-aqyfr4");
    			add_location(div5, file$7, 9, 0, 151);
    			attr_dev(path0, "d", "M-3.11,410.8c56,5,106.56-8.77,152.36-43.23-47.89-4.13-79.86-28.14-97.63-73.21,16,2.44,30.77,2.3,46.51-1.91-24.84-6.09-44.73-18.21-60-37.41S15.32,213.9,15.38,188.45c14.65,7.48,29.37,12.07,46.68,12.78-22.82-16.77-37.49-37.61-43.29-64.17C13,110.68,17,85.73,30.31,61.75q85.13,100,214.85,109.34c-.33-11.08-1.75-21.73-.76-32.15,4-42.5,26-73.13,65.46-88.78,41.28-16.37,79.22-8,112,22.16,2.48,2.28,4.55,2.9,7.83,2.12,19.82-4.68,38.77-11.52,56.54-21.53,1.43-.8,2.92-1.5,5.38-2.76-8.05,24.47-22.71,42.58-42.92,57.38,6.13-1.11,12.31-2,18.36-3.37,6.46-1.5,12.85-3.33,19.16-5.34,6.1-1.95,12.07-4.32,19.55-7-4.48,6-7.57,11.41-11.78,15.66-11.9,12-24.14,23.72-36.54,35.23-2.56,2.38-3.77,4.42-3.69,7.93,1.32,62.37-15.12,119.9-48.67,172.3C361.52,391,300.21,434.46,220.88,451,155.93,464.6,92.65,458.29,32,430.75c-12.17-5.52-23.75-12.33-35.6-18.55Z");
    			attr_dev(path0, "transform", "translate(3.64 -41.93)");
    			add_location(path0, file$7, 15, 10, 501);
    			attr_dev(g, "id", "tfnVb0.tif");
    			add_location(g, file$7, 14, 8, 471);
    			attr_dev(svg0, "id", "twitter");
    			attr_dev(svg0, "data-name", "twitter");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 509.42 416");
    			attr_dev(svg0, "class", "svelte-aqyfr4");
    			add_location(svg0, file$7, 13, 6, 364);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "href", "https://twitter.com/jared_whalen");
    			add_location(a1, file$7, 12, 4, 298);
    			attr_dev(path1, "d", "M249.88,233.65a16.29,16.29,0,0,0-5.15,31.75c.81.15,1.11-.35,1.11-.78s0-1.41,0-2.77c-4.53,1-5.49-2.19-5.49-2.19a4.3,4.3,0,0,0-1.81-2.38c-1.48-1,.11-1,.11-1a3.41,3.41,0,0,1,2.5,1.68,3.46,3.46,0,0,0,4.74,1.35,3.54,3.54,0,0,1,1-2.18c-3.61-.41-7.42-1.8-7.42-8a6.3,6.3,0,0,1,1.68-4.37,5.82,5.82,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.41,15.41,0,0,1,8.16,0c3.11-2.11,4.47-1.67,4.47-1.67a5.82,5.82,0,0,1,.16,4.31,6.26,6.26,0,0,1,1.68,4.37c0,6.26-3.81,7.64-7.44,8a3.91,3.91,0,0,1,1.11,3c0,2.18,0,3.93,0,4.47s.29.94,1.12.78a16.3,16.3,0,0,0-5.16-31.75Z");
    			attr_dev(path1, "transform", "translate(-233.59 -233.65)");
    			set_style(path1, "fill-rule", "evenodd");
    			add_location(path1, file$7, 23, 8, 1628);
    			attr_dev(svg1, "id", "github");
    			attr_dev(svg1, "data-name", "github");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 32.58 31.77");
    			attr_dev(svg1, "class", "svelte-aqyfr4");
    			add_location(svg1, file$7, 22, 6, 1522);
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "href", "https://github.com/jaredwhalen/concert-log");
    			add_location(a2, file$7, 21, 4, 1446);
    			attr_dev(div6, "class", "g-share svelte-aqyfr4");
    			add_location(div6, file$7, 11, 2, 272);
    			attr_dev(header, "class", "svelte-aqyfr4");
    			add_location(header, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, t6);
    			append_dev(div3, span);
    			append_dev(header, t8);
    			append_dev(header, div5);
    			append_dev(div5, t9);
    			append_dev(div5, a0);
    			append_dev(header, t11);
    			append_dev(header, div6);
    			append_dev(div6, a1);
    			append_dev(a1, svg0);
    			append_dev(svg0, g);
    			append_dev(g, path0);
    			append_dev(div6, t12);
    			append_dev(div6, a2);
    			append_dev(a2, svg1);
    			append_dev(svg1, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/Intro.svelte generated by Svelte v3.38.2 */

    const file$6 = "src/components/Intro.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let p0;
    	let span;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let a;
    	let t5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			span = element("span");
    			span.textContent = "H";
    			t1 = text("aving released seven studio albums and five EPs over two decades, mewithoutYou has a thick catalogue to choose from when planning setlists on their farewell tour beginning in May 2022. Fans of the band know\n    that historically the setlist can vary greatly from night to night. Even on their most recent tour celebrating the 15 and 16 year anniversaries of “Brother, Sister” where the band played the album from from to back, they managed to not repeat the\n    same setlist once through encore sets spanning every record.");
    			t2 = space();
    			p1 = element("p");
    			t3 = text("To demonstrate the uniqueness of every mewithoutYou show (and just as an opportunity to geek out about an amazing band), I am using ");
    			a = element("a");
    			a.textContent = "setlist.fm";
    			t5 = text(" data to visualize what songs the band plays on each night of their farewell tour, as well as what\n    order in the set it is played. This app will update daily as new setlist data is made available.");
    			attr_dev(span, "class", "firstcharacter svelte-1vzk9u0");
    			add_location(span, file$6, 2, 5, 26);
    			attr_dev(p0, "class", "svelte-1vzk9u0");
    			add_location(p0, file$6, 2, 2, 23);
    			attr_dev(a, "href", "https://www.setlist.fm/");
    			add_location(a, file$6, 6, 137, 728);
    			attr_dev(p1, "class", "svelte-1vzk9u0");
    			add_location(p1, file$6, 6, 2, 593);
    			attr_dev(div, "class", "intro svelte-1vzk9u0");
    			add_location(div, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(p0, span);
    			append_dev(p0, t1);
    			append_dev(div, t2);
    			append_dev(div, p1);
    			append_dev(p1, t3);
    			append_dev(p1, a);
    			append_dev(p1, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Intro", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Intro> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Intro extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Intro",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Legend.svelte generated by Svelte v3.38.2 */

    const file$5 = "src/components/Legend.svelte";

    function create_fragment$5(ctx) {
    	let div1;
    	let h4;
    	let t1;
    	let div0;
    	let t2;
    	let svg;
    	let defs;
    	let linearGradient;
    	let stop0;
    	let stop0_stop_color_value;
    	let stop1;
    	let stop1_stop_color_value;
    	let rect;
    	let t3;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Setlist position";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("Earlier\n    ");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			linearGradient = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			rect = svg_element("rect");
    			t3 = text("\n    Later");
    			attr_dev(h4, "class", "svelte-1ps0mak");
    			add_location(h4, file$5, 5, 2, 60);
    			attr_dev(stop0, "offset", "5%");
    			attr_dev(stop0, "stop-color", stop0_stop_color_value = /*colors*/ ctx[0][0]);
    			add_location(stop0, file$5, 11, 10, 219);
    			attr_dev(stop1, "offset", "95%");
    			attr_dev(stop1, "stop-color", stop1_stop_color_value = /*colors*/ ctx[0][1]);
    			add_location(stop1, file$5, 12, 10, 276);
    			attr_dev(linearGradient, "id", "gradient");
    			add_location(linearGradient, file$5, 10, 8, 178);
    			add_location(defs, file$5, 9, 6, 163);
    			attr_dev(rect, "width", "100%");
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "fill", "url('#gradient')");
    			add_location(rect, file$5, 17, 6, 410);
    			attr_dev(svg, "width", "100px");
    			attr_dev(svg, "height", "20px");
    			add_location(svg, file$5, 8, 4, 123);
    			attr_dev(div0, "class", "flex svelte-1ps0mak");
    			add_location(div0, file$5, 6, 2, 88);
    			attr_dev(div1, "id", "Legend");
    			attr_dev(div1, "class", "svelte-1ps0mak");
    			add_location(div1, file$5, 4, 0, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h4);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, t2);
    			append_dev(div0, svg);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient);
    			append_dev(linearGradient, stop0);
    			append_dev(linearGradient, stop1);
    			append_dev(svg, rect);
    			append_dev(div0, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*colors*/ 1 && stop0_stop_color_value !== (stop0_stop_color_value = /*colors*/ ctx[0][0])) {
    				attr_dev(stop0, "stop-color", stop0_stop_color_value);
    			}

    			if (dirty & /*colors*/ 1 && stop1_stop_color_value !== (stop1_stop_color_value = /*colors*/ ctx[0][1])) {
    				attr_dev(stop1, "stop-color", stop1_stop_color_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Legend", slots, []);
    	let { colors } = $$props;
    	const writable_props = ["colors"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Legend> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("colors" in $$props) $$invalidate(0, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({ colors });

    	$$self.$inject_state = $$props => {
    		if ("colors" in $$props) $$invalidate(0, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [colors];
    }

    class Legend extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { colors: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Legend",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*colors*/ ctx[0] === undefined && !("colors" in props)) {
    			console.warn("<Legend> was created without expected prop 'colors'");
    		}
    	}

    	get colors() {
    		throw new Error("<Legend>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<Legend>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function handle(node) {
      const onDown = getOnDown(node);

      node.addEventListener("touchstart", onDown);
      node.addEventListener("mousedown", onDown);
      return {
        destroy() {
          node.removeEventListener("touchstart", onDown);
          node.removeEventListener("mousedown", onDown);
        }
      };
    }

    function getOnDown(node) {
      const onMove = getOnMove(node);

      return function (e) {
        e.preventDefault();
        node.dispatchEvent(new CustomEvent("dragstart"));

        const moveevent = "touches" in e ? "touchmove" : "mousemove";
        const upevent = "touches" in e ? "touchend" : "mouseup";

        document.addEventListener(moveevent, onMove);
        document.addEventListener(upevent, onUp);

        function onUp(e) {
          e.stopPropagation();

          document.removeEventListener(moveevent, onMove);
          document.removeEventListener(upevent, onUp);

          node.dispatchEvent(new CustomEvent("dragend"));
        }  };
    }

    function getOnMove(node) {
      const track = node.parentNode;

      return function (e) {
        const { left, width } = track.getBoundingClientRect();
        const clickOffset = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clickPos = Math.min(Math.max((clickOffset - left) / width, 0), 1) || 0;
        node.dispatchEvent(new CustomEvent("drag", { detail: clickPos }));
      };
    }

    /* node_modules/@bulatdashiev/svelte-slider/src/Thumb.svelte generated by Svelte v3.38.2 */
    const file$4 = "node_modules/@bulatdashiev/svelte-slider/src/Thumb.svelte";

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;
    	let div1_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "thumb-content svelte-8w8x88");
    			toggle_class(div0, "active", /*active*/ ctx[1]);
    			add_location(div0, file$4, 7, 2, 252);
    			attr_dev(div1, "class", "thumb svelte-8w8x88");
    			attr_dev(div1, "style", div1_style_value = `left: ${/*pos*/ ctx[0] * 100}%;`);
    			add_location(div1, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(handle.call(null, div1)),
    					listen_dev(div1, "dragstart", /*dragstart_handler*/ ctx[5], false, false, false),
    					listen_dev(div1, "drag", /*drag_handler*/ ctx[6], false, false, false),
    					listen_dev(div1, "dragend", /*dragend_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (dirty & /*active*/ 2) {
    				toggle_class(div0, "active", /*active*/ ctx[1]);
    			}

    			if (!current || dirty & /*pos*/ 1 && div1_style_value !== (div1_style_value = `left: ${/*pos*/ ctx[0] * 100}%;`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Thumb", slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let { pos } = $$props, active;
    	const writable_props = ["pos"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Thumb> was created with unknown prop '${key}'`);
    	});

    	const dragstart_handler = () => ($$invalidate(1, active = true), dispatch("active", true));
    	const drag_handler = ({ detail: v }) => $$invalidate(0, pos = v);
    	const dragend_handler = () => ($$invalidate(1, active = false), dispatch("active", false));

    	$$self.$$set = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		handle,
    		dispatch,
    		pos,
    		active
    	});

    	$$self.$inject_state = $$props => {
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		pos,
    		active,
    		dispatch,
    		$$scope,
    		slots,
    		dragstart_handler,
    		drag_handler,
    		dragend_handler
    	];
    }

    class Thumb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { pos: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Thumb",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pos*/ ctx[0] === undefined && !("pos" in props)) {
    			console.warn("<Thumb> was created without expected prop 'pos'");
    		}
    	}

    	get pos() {
    		throw new Error("<Thumb>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pos(value) {
    		throw new Error("<Thumb>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@bulatdashiev/svelte-slider/src/Slider.svelte generated by Svelte v3.38.2 */
    const file$3 = "node_modules/@bulatdashiev/svelte-slider/src/Slider.svelte";
    const get_right_slot_changes = dirty => ({});
    const get_right_slot_context = ctx => ({});
    const get_left_slot_changes = dirty => ({});
    const get_left_slot_context = ctx => ({});

    // (2:0) {#if range}
    function create_if_block_1(ctx) {
    	let input;
    	let input_value_value;
    	let input_name_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "number");
    			input.value = input_value_value = /*value*/ ctx[0][1];
    			attr_dev(input, "name", input_name_value = /*name*/ ctx[1][1]);
    			attr_dev(input, "class", "svelte-1q9yxz9");
    			add_location(input, file$3, 2, 2, 72);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value*/ 1 && input_value_value !== (input_value_value = /*value*/ ctx[0][1])) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty & /*name*/ 2 && input_name_value !== (input_name_value = /*name*/ ctx[1][1])) {
    				attr_dev(input, "name", input_name_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(2:0) {#if range}",
    		ctx
    	});

    	return block;
    }

    // (11:12)           
    function fallback_block_3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "thumb svelte-1q9yxz9");
    			add_location(div, file$3, 11, 8, 329);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_3.name,
    		type: "fallback",
    		source: "(11:12)           ",
    		ctx
    	});

    	return block;
    }

    // (10:22)         
    function fallback_block_2(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);
    	const default_slot_or_fallback = default_slot || fallback_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[15], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_2.name,
    		type: "fallback",
    		source: "(10:22)         ",
    		ctx
    	});

    	return block;
    }

    // (9:2) <Thumb bind:pos={pos[0]} on:active={({ detail: v }) => active = v}>
    function create_default_slot_1(ctx) {
    	let current;
    	const left_slot_template = /*#slots*/ ctx[10].left;
    	const left_slot = create_slot(left_slot_template, ctx, /*$$scope*/ ctx[15], get_left_slot_context);
    	const left_slot_or_fallback = left_slot || fallback_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (left_slot_or_fallback) left_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (left_slot_or_fallback) {
    				left_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (left_slot) {
    				if (left_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot(left_slot, left_slot_template, ctx, /*$$scope*/ ctx[15], dirty, get_left_slot_changes, get_left_slot_context);
    				}
    			} else {
    				if (left_slot_or_fallback && left_slot_or_fallback.p && dirty & /*$$scope*/ 32768) {
    					left_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(left_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(left_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (left_slot_or_fallback) left_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(9:2) <Thumb bind:pos={pos[0]} on:active={({ detail: v }) => active = v}>",
    		ctx
    	});

    	return block;
    }

    // (16:2) {#if range}
    function create_if_block(ctx) {
    	let thumb;
    	let updating_pos;
    	let current;

    	function thumb_pos_binding_1(value) {
    		/*thumb_pos_binding_1*/ ctx[13](value);
    	}

    	let thumb_props = {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*pos*/ ctx[3][1] !== void 0) {
    		thumb_props.pos = /*pos*/ ctx[3][1];
    	}

    	thumb = new Thumb({ props: thumb_props, $$inline: true });
    	binding_callbacks.push(() => bind(thumb, "pos", thumb_pos_binding_1));
    	thumb.$on("active", /*active_handler_1*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(thumb.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(thumb, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const thumb_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				thumb_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_pos && dirty & /*pos*/ 8) {
    				updating_pos = true;
    				thumb_changes.pos = /*pos*/ ctx[3][1];
    				add_flush_callback(() => updating_pos = false);
    			}

    			thumb.$set(thumb_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(thumb.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(thumb.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(thumb, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:2) {#if range}",
    		ctx
    	});

    	return block;
    }

    // (19:14)             
    function fallback_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "thumb svelte-1q9yxz9");
    			add_location(div, file$3, 19, 10, 533);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block_1.name,
    		type: "fallback",
    		source: "(19:14)             ",
    		ctx
    	});

    	return block;
    }

    // (18:25)           
    function fallback_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);
    	const default_slot_or_fallback = default_slot || fallback_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[15], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(18:25)           ",
    		ctx
    	});

    	return block;
    }

    // (17:4) <Thumb bind:pos={pos[1]} on:active={({ detail: v }) => active = v}>
    function create_default_slot$1(ctx) {
    	let current;
    	const right_slot_template = /*#slots*/ ctx[10].right;
    	const right_slot = create_slot(right_slot_template, ctx, /*$$scope*/ ctx[15], get_right_slot_context);
    	const right_slot_or_fallback = right_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			if (right_slot_or_fallback) right_slot_or_fallback.c();
    		},
    		m: function mount(target, anchor) {
    			if (right_slot_or_fallback) {
    				right_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (right_slot) {
    				if (right_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot(right_slot, right_slot_template, ctx, /*$$scope*/ ctx[15], dirty, get_right_slot_changes, get_right_slot_context);
    				}
    			} else {
    				if (right_slot_or_fallback && right_slot_or_fallback.p && dirty & /*$$scope*/ 32768) {
    					right_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(right_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(right_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (right_slot_or_fallback) right_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(17:4) <Thumb bind:pos={pos[1]} on:active={({ detail: v }) => active = v}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let input;
    	let input_value_value;
    	let input_name_value;
    	let t0;
    	let t1;
    	let div1;
    	let div0;
    	let t2;
    	let thumb;
    	let updating_pos;
    	let t3;
    	let current;
    	let if_block0 = /*range*/ ctx[2] && create_if_block_1(ctx);

    	function thumb_pos_binding(value) {
    		/*thumb_pos_binding*/ ctx[11](value);
    	}

    	let thumb_props = {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*pos*/ ctx[3][0] !== void 0) {
    		thumb_props.pos = /*pos*/ ctx[3][0];
    	}

    	thumb = new Thumb({ props: thumb_props, $$inline: true });
    	binding_callbacks.push(() => bind(thumb, "pos", thumb_pos_binding));
    	thumb.$on("active", /*active_handler*/ ctx[12]);
    	let if_block1 = /*range*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t2 = space();
    			create_component(thumb.$$.fragment);
    			t3 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(input, "type", "number");
    			input.value = input_value_value = /*value*/ ctx[0][0];
    			attr_dev(input, "name", input_name_value = /*name*/ ctx[1][0]);
    			attr_dev(input, "class", "svelte-1q9yxz9");
    			add_location(input, file$3, 0, 0, 0);
    			attr_dev(div0, "class", "progress svelte-1q9yxz9");
    			attr_dev(div0, "style", /*progress*/ ctx[5]);
    			add_location(div0, file$3, 5, 2, 159);
    			attr_dev(div1, "class", "track svelte-1q9yxz9");
    			add_location(div1, file$3, 4, 0, 136);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t2);
    			mount_component(thumb, div1, null);
    			append_dev(div1, t3);
    			if (if_block1) if_block1.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*value*/ 1 && input_value_value !== (input_value_value = /*value*/ ctx[0][0])) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (!current || dirty & /*name*/ 2 && input_name_value !== (input_name_value = /*name*/ ctx[1][0])) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (/*range*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty & /*progress*/ 32) {
    				attr_dev(div0, "style", /*progress*/ ctx[5]);
    			}

    			const thumb_changes = {};

    			if (dirty & /*$$scope*/ 32768) {
    				thumb_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_pos && dirty & /*pos*/ 8) {
    				updating_pos = true;
    				thumb_changes.pos = /*pos*/ ctx[3][0];
    				add_flush_callback(() => updating_pos = false);
    			}

    			thumb.$set(thumb_changes);

    			if (/*range*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*range*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(thumb.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(thumb.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(thumb);
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function checkPos(pos) {
    	return [Math.min(...pos), Math.max(...pos)];
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let progress;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Slider", slots, ['default','left','right']);
    	const dispatch = createEventDispatcher();
    	let { name = [] } = $$props;
    	let { range = false } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { value = [min, max] } = $$props;
    	let pos;
    	let active = false;
    	let { order = false } = $$props;

    	function setValue(pos) {
    		const offset = min % step;
    		const width = max - min;
    		$$invalidate(0, value = pos.map(v => min + v * width).map(v => Math.round((v - offset) / step) * step + offset));
    		dispatch("input", value);
    	}

    	function setPos(value) {
    		$$invalidate(3, pos = value.map(v => Math.min(Math.max(v, min), max)).map(v => (v - min) / (max - min)));
    	}

    	function clamp() {
    		setPos(value);
    		setValue(pos);
    	}

    	const writable_props = ["name", "range", "min", "max", "step", "value", "order"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Slider> was created with unknown prop '${key}'`);
    	});

    	function thumb_pos_binding(value) {
    		if ($$self.$$.not_equal(pos[0], value)) {
    			pos[0] = value;
    			((($$invalidate(3, pos), $$invalidate(2, range)), $$invalidate(9, order)), $$invalidate(4, active));
    		}
    	}

    	const active_handler = ({ detail: v }) => $$invalidate(4, active = v);

    	function thumb_pos_binding_1(value) {
    		if ($$self.$$.not_equal(pos[1], value)) {
    			pos[1] = value;
    			((($$invalidate(3, pos), $$invalidate(2, range)), $$invalidate(9, order)), $$invalidate(4, active));
    		}
    	}

    	const active_handler_1 = ({ detail: v }) => $$invalidate(4, active = v);

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("range" in $$props) $$invalidate(2, range = $$props.range);
    		if ("min" in $$props) $$invalidate(6, min = $$props.min);
    		if ("max" in $$props) $$invalidate(7, max = $$props.max);
    		if ("step" in $$props) $$invalidate(8, step = $$props.step);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("order" in $$props) $$invalidate(9, order = $$props.order);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Thumb,
    		dispatch,
    		name,
    		range,
    		min,
    		max,
    		step,
    		value,
    		pos,
    		active,
    		order,
    		setValue,
    		setPos,
    		checkPos,
    		clamp,
    		progress
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("range" in $$props) $$invalidate(2, range = $$props.range);
    		if ("min" in $$props) $$invalidate(6, min = $$props.min);
    		if ("max" in $$props) $$invalidate(7, max = $$props.max);
    		if ("step" in $$props) $$invalidate(8, step = $$props.step);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("pos" in $$props) $$invalidate(3, pos = $$props.pos);
    		if ("active" in $$props) $$invalidate(4, active = $$props.active);
    		if ("order" in $$props) $$invalidate(9, order = $$props.order);
    		if ("progress" in $$props) $$invalidate(5, progress = $$props.progress);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*range, order, active, pos*/ 540) {
    			if (range && order && active) $$invalidate(3, pos = checkPos(pos));
    		}

    		if ($$self.$$.dirty & /*active, pos*/ 24) {
    			if (active) setValue(pos);
    		}

    		if ($$self.$$.dirty & /*active, value*/ 17) {
    			if (!active) setPos(value);
    		}

    		if ($$self.$$.dirty & /*min, max*/ 192) {
    			(clamp());
    		}

    		if ($$self.$$.dirty & /*range, pos*/ 12) {
    			$$invalidate(5, progress = `
    left: ${range ? Math.min(pos[0], pos[1]) * 100 : 0}%;
    right: ${100 - Math.max(pos[0], range ? pos[1] : pos[0]) * 100}%;
  `);
    		}
    	};

    	return [
    		value,
    		name,
    		range,
    		pos,
    		active,
    		progress,
    		min,
    		max,
    		step,
    		order,
    		slots,
    		thumb_pos_binding,
    		active_handler,
    		thumb_pos_binding_1,
    		active_handler_1,
    		$$scope
    	];
    }

    class Slider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			name: 1,
    			range: 2,
    			min: 6,
    			max: 7,
    			step: 8,
    			value: 0,
    			order: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Slider",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get name() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get range() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set range(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get order() {
    		throw new Error("<Slider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set order(value) {
    		throw new Error("<Slider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const windowWidth = writable(window.innerWidth);

    derived(windowWidth,
        $windowWidth => $windowWidth <= 560 ? true : false
    );

    derived(windowWidth,
        $windowWidth => $windowWidth > 1200 ? true : false
    );

    const volume = writable([0]);

    /* src/components/Controls.svelte generated by Svelte v3.38.2 */
    const file$2 = "src/components/Controls.svelte";

    // (10:2) <Slider bind:value={$volume} min=0 max=1 step=0.1>
    function create_default_slot(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "🔊";
    			set_style(span, "font-size", "20px");
    			attr_dev(span, "class", "svelte-7ky91v");
    			add_location(span, file$2, 9, 52, 253);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(10:2) <Slider bind:value={$volume} min=0 max=1 step=0.1>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t;
    	let slider;
    	let updating_value;
    	let current;

    	function slider_value_binding(value) {
    		/*slider_value_binding*/ ctx[2](value);
    	}

    	let slider_props = {
    		min: "0",
    		max: "1",
    		step: "0.1",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*$volume*/ ctx[0] !== void 0) {
    		slider_props.value = /*$volume*/ ctx[0];
    	}

    	slider = new Slider({ props: slider_props, $$inline: true });
    	binding_callbacks.push(() => bind(slider, "value", slider_value_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text("Turn up the volume to play songs on hover\n  ");
    			create_component(slider.$$.fragment);
    			attr_dev(div, "id", "Controls");
    			attr_dev(div, "class", "svelte-7ky91v");
    			add_location(div, file$2, 7, 0, 136);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			mount_component(slider, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const slider_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				slider_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*$volume*/ 1) {
    				updating_value = true;
    				slider_changes.value = /*$volume*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			slider.$set(slider_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(slider.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(slider.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(slider);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $volume;
    	validate_store(volume, "volume");
    	component_subscribe($$self, volume, $$value => $$invalidate(0, $volume = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Controls", slots, []);
    	let { colors } = $$props;
    	const writable_props = ["colors"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Controls> was created with unknown prop '${key}'`);
    	});

    	function slider_value_binding(value) {
    		$volume = value;
    		volume.set($volume);
    	}

    	$$self.$$set = $$props => {
    		if ("colors" in $$props) $$invalidate(1, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({ Slider, volume, colors, $volume });

    	$$self.$inject_state = $$props => {
    		if ("colors" in $$props) $$invalidate(1, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$volume, colors, slider_value_binding];
    }

    class Controls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { colors: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Controls",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*colors*/ ctx[1] === undefined && !("colors" in props)) {
    			console.warn("<Controls> was created without expected prop 'colors'");
    		}
    	}

    	get colors() {
    		throw new Error("<Controls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<Controls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        let r0 = Math.round(start / step), r1 = Math.round(stop / step);
        if (r0 * step < start) ++r0;
        if (r1 * step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) * step;
      } else {
        step = -step;
        let r0 = Math.round(start * step), r1 = Math.round(stop * step);
        if (r0 / step < start) ++r0;
        if (r1 / step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function initInterpolator(domain, interpolator) {
      switch (arguments.length) {
        case 0: break;
        case 1: {
          if (typeof domain === "function") this.interpolator(domain);
          else this.range(domain);
          break;
        }
        default: {
          this.domain(domain);
          if (typeof interpolator === "function") this.interpolator(interpolator);
          else this.range(interpolator);
          break;
        }
      }
      return this;
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy: function(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable: function() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function() {
        return this;
      },
      displayable: function() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    }

    function rgb_formatRgb() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "rgb(" : "rgba(")
          + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.b) || 0))
          + (a === 1 ? ")" : ", " + a + ")");
    }

    function hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      displayable: function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl: function() {
        var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "hsl(" : "hsla(")
            + (this.h || 0) + ", "
            + (this.s || 0) * 100 + "%, "
            + (this.l || 0) * 100 + "%"
            + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant = x => () => x;

    function linear(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear(a, d) : constant(isNaN(a) ? b : a);
    }

    var rgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb(start, end) {
        var r = color((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb.gamma = rgbGamma;

      return rgb;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function string(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, rgb) : string)
          : b instanceof color ? rgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    function identity$1(x) {
      return x;
    }

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "−" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function transformer() {
      var x0 = 0,
          x1 = 1,
          t0,
          t1,
          k10,
          transform,
          interpolator = identity$1,
          clamp = false,
          unknown;

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : interpolator(k10 === 0 ? 0.5 : (x = (transform(x) - t0) * k10, clamp ? Math.max(0, Math.min(1, x)) : x));
      }

      scale.domain = function(_) {
        return arguments.length ? ([x0, x1] = _, t0 = transform(x0 = +x0), t1 = transform(x1 = +x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0), scale) : [x0, x1];
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = !!_, scale) : clamp;
      };

      scale.interpolator = function(_) {
        return arguments.length ? (interpolator = _, scale) : interpolator;
      };

      function range(interpolate) {
        return function(_) {
          var r0, r1;
          return arguments.length ? ([r0, r1] = _, interpolator = interpolate(r0, r1), scale) : [interpolator(0), interpolator(1)];
        };
      }

      scale.range = range(interpolate);

      scale.rangeRound = range(interpolateRound);

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t) {
        transform = t, t0 = t(x0), t1 = t(x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0);
        return scale;
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .interpolator(source.interpolator())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function sequential() {
      var scale = linearish(transformer()(identity$1));

      scale.copy = function() {
        return copy(scale, sequential());
      };

      return initInterpolator.apply(scale, arguments);
    }

    /* src/components/Viz.svelte generated by Svelte v3.38.2 */
    const file$1 = "src/components/Viz.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (43:2) {#each shows as show}
    function create_each_block_5(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*show*/ ctx[15].city + "";
    	let t0;
    	let t1;
    	let t2_value = /*show*/ ctx[15].state + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text(", ");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(div0, "class", "label svelte-5p3x79");
    			add_location(div0, file$1, 45, 6, 814);
    			attr_dev(div1, "class", "show svelte-5p3x79");
    			add_location(div1, file$1, 43, 4, 739);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div1, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shows*/ 1 && t0_value !== (t0_value = /*show*/ ctx[15].city + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*shows*/ 1 && t2_value !== (t2_value = /*show*/ ctx[15].state + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(43:2) {#each shows as show}",
    		ctx
    	});

    	return block;
    }

    // (56:12) {#each album.tracks as track}
    function create_each_block_4(ctx) {
    	let div1;
    	let div0;
    	let t_value = /*track*/ ctx[21].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(t_value);
    			attr_dev(div0, "class", "track svelte-5p3x79");
    			add_location(div0, file$1, 57, 14, 1124);
    			attr_dev(div1, "class", "cell svelte-5p3x79");
    			add_location(div1, file$1, 56, 12, 1091);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(56:12) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (53:6) {#each discography as album}
    function create_each_block_3(ctx) {
    	let div;
    	let h3;
    	let t0_value = /*album*/ ctx[18].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let each_value_4 = /*album*/ ctx[18].tracks;
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr_dev(h3, "class", "svelte-5p3x79");
    			add_location(h3, file$1, 54, 10, 1015);
    			attr_dev(div, "class", "album svelte-5p3x79");
    			add_location(div, file$1, 53, 8, 985);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*discography*/ 16) {
    				each_value_4 = /*album*/ ctx[18].tracks;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(53:6) {#each discography as album}",
    		ctx
    	});

    	return block;
    }

    // (70:16) {#each album.tracks as track}
    function create_each_block_2(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let div0_data_index_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*track*/ ctx[21]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[12](/*track*/ ctx[21]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", div0_class_value = "track " + (/*track*/ ctx[21].played ? "played" : "hidden") + " svelte-5p3x79");

    			set_style(div0, "background", /*track*/ ctx[21].played
    			? /*colorScale*/ ctx[5](/*track*/ ctx[21].index)
    			: "");

    			attr_dev(div0, "data-index", div0_data_index_value = /*track*/ ctx[21].index);
    			add_location(div0, file$1, 71, 20, 1528);
    			attr_dev(div1, "class", "cell svelte-5p3x79");
    			add_location(div1, file$1, 70, 18, 1489);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", click_handler, false, false, false),
    					listen_dev(div0, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(div0, "mouseleave", /*mouseleave_handler*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*shows*/ 1 && div0_class_value !== (div0_class_value = "track " + (/*track*/ ctx[21].played ? "played" : "hidden") + " svelte-5p3x79")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*shows*/ 1) {
    				set_style(div0, "background", /*track*/ ctx[21].played
    				? /*colorScale*/ ctx[5](/*track*/ ctx[21].index)
    				: "");
    			}

    			if (dirty & /*shows*/ 1 && div0_data_index_value !== (div0_data_index_value = /*track*/ ctx[21].index)) {
    				attr_dev(div0, "data-index", div0_data_index_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(70:16) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (67:10) {#each show.setlist as album}
    function create_each_block_1(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let each_value_2 = /*album*/ ctx[18].tracks;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = " ";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "svelte-5p3x79");
    			add_location(h3, file$1, 68, 14, 1409);
    			attr_dev(div, "class", "album svelte-5p3x79");
    			add_location(div, file$1, 67, 12, 1375);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shows, colorScale, onHover, player*/ 101) {
    				each_value_2 = /*album*/ ctx[18].tracks;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(67:10) {#each show.setlist as album}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {#each shows as show}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*show*/ ctx[15].setlist;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "setlist");
    			add_location(div, file$1, 65, 8, 1301);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shows, colorScale, onHover, player*/ 101) {
    				each_value_1 = /*show*/ ctx[15].setlist;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(65:6) {#each shows as show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let audio;
    	let audio_src_value;
    	let t0;
    	let div4;
    	let div0;
    	let t1;
    	let div3;
    	let div1;
    	let t2;
    	let div2;
    	let mounted;
    	let dispose;
    	let each_value_5 = /*shows*/ ctx[0];
    	validate_each_argument(each_value_5);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_2[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_3 = /*discography*/ ctx[4];
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value = /*shows*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			audio = element("audio");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (audio.src !== (audio_src_value = /*src*/ ctx[1])) attr_dev(audio, "src", audio_src_value);
    			add_location(audio, file$1, 31, 2, 555);
    			attr_dev(div0, "id", "head");
    			attr_dev(div0, "class", "svelte-5p3x79");
    			add_location(div0, file$1, 41, 2, 695);
    			attr_dev(div1, "id", "discography");
    			attr_dev(div1, "class", "svelte-5p3x79");
    			add_location(div1, file$1, 51, 4, 919);
    			attr_dev(div2, "id", "concerts");
    			attr_dev(div2, "class", "svelte-5p3x79");
    			add_location(div2, file$1, 63, 4, 1245);
    			attr_dev(div3, "id", "table");
    			attr_dev(div3, "class", "svelte-5p3x79");
    			add_location(div3, file$1, 50, 2, 898);
    			attr_dev(div4, "id", "viz");
    			attr_dev(div4, "class", "svelte-5p3x79");
    			add_location(div4, file$1, 39, 0, 677);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio, anchor);
    			/*audio_binding*/ ctx[8](audio);

    			if (!isNaN(/*$volume*/ ctx[3][0])) {
    				audio.volume = /*$volume*/ ctx[3][0];
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div3, t2);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(audio, "volumechange", /*audio_volumechange_handler*/ ctx[9]),
    					listen_dev(audio, "canplay", /*canplay_handler*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*src*/ 2 && audio.src !== (audio_src_value = /*src*/ ctx[1])) {
    				attr_dev(audio, "src", audio_src_value);
    			}

    			if (dirty & /*$volume*/ 8 && !isNaN(/*$volume*/ ctx[3][0])) {
    				audio.volume = /*$volume*/ ctx[3][0];
    			}

    			if (dirty & /*shows*/ 1) {
    				each_value_5 = /*shows*/ ctx[0];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_5(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_5.length;
    			}

    			if (dirty & /*discography*/ 16) {
    				each_value_3 = /*discography*/ ctx[4];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty & /*shows, colorScale, onHover, player*/ 101) {
    				each_value = /*shows*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(audio);
    			/*audio_binding*/ ctx[8](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $volume;
    	validate_store(volume, "volume");
    	component_subscribe($$self, volume, $$value => $$invalidate(3, $volume = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Viz", slots, []);
    	let { shows } = $$props;
    	let discography = shows[0].setlist;
    	let player;
    	let src;
    	let maxNumberOfSongs = shows.map(d => d.setlist.map(a => a.tracks.filter(t => t.played).length).reduce((a, b) => a + b, 0)).sort((a, b) => b - a)[0];
    	let { colors } = $$props;
    	let colorScale = sequential(colors).domain([1, maxNumberOfSongs]);

    	const onHover = preview_url => {
    		player.pause();
    		$$invalidate(1, src = preview_url);
    		player.play();
    	};

    	const writable_props = ["shows", "colors"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Viz> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			player = $$value;
    			$$invalidate(2, player);
    		});
    	}

    	function audio_volumechange_handler() {
    		$volume[0] = this.volume;
    		volume.set($volume);
    	}

    	const canplay_handler = () => player.play();
    	const click_handler = track => onHover(track.preview_url);
    	const mouseenter_handler = track => onHover(track.preview_url);
    	const mouseleave_handler = () => player.pause();

    	$$self.$$set = $$props => {
    		if ("shows" in $$props) $$invalidate(0, shows = $$props.shows);
    		if ("colors" in $$props) $$invalidate(7, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({
    		scaleSequential: sequential,
    		volume,
    		shows,
    		discography,
    		player,
    		src,
    		maxNumberOfSongs,
    		colors,
    		colorScale,
    		onHover,
    		$volume
    	});

    	$$self.$inject_state = $$props => {
    		if ("shows" in $$props) $$invalidate(0, shows = $$props.shows);
    		if ("discography" in $$props) $$invalidate(4, discography = $$props.discography);
    		if ("player" in $$props) $$invalidate(2, player = $$props.player);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    		if ("maxNumberOfSongs" in $$props) maxNumberOfSongs = $$props.maxNumberOfSongs;
    		if ("colors" in $$props) $$invalidate(7, colors = $$props.colors);
    		if ("colorScale" in $$props) $$invalidate(5, colorScale = $$props.colorScale);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*src*/ 2) ;
    	};

    	return [
    		shows,
    		src,
    		player,
    		$volume,
    		discography,
    		colorScale,
    		onHover,
    		colors,
    		audio_binding,
    		audio_volumechange_handler,
    		canplay_handler,
    		click_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class Viz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { shows: 0, colors: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Viz",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*shows*/ ctx[0] === undefined && !("shows" in props)) {
    			console.warn("<Viz> was created without expected prop 'shows'");
    		}

    		if (/*colors*/ ctx[7] === undefined && !("colors" in props)) {
    			console.warn("<Viz> was created without expected prop 'colors'");
    		}
    	}

    	get shows() {
    		throw new Error("<Viz>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set shows(value) {
    		throw new Error("<Viz>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colors() {
    		throw new Error("<Viz>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colors(value) {
    		throw new Error("<Viz>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var shows = [
    	{
    		date: "2021-08-15T00:00:00.000Z",
    		venue: "Union Transfer",
    		city: "Philadelphia",
    		state: "PA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-04T00:00:00.000Z",
    		venue: "Phantom Power",
    		city: "Millersville",
    		state: "PA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-05T00:00:00.000Z",
    		venue: "Le Poisson Rouge",
    		city: "New York",
    		state: "NY",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-06T00:00:00.000Z",
    		venue: "Black Cat",
    		city: "Washington",
    		state: "DC",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-07T00:00:00.000Z",
    		venue: "Heaven @ The Masquerade",
    		city: "Atlanta",
    		state: "GA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-08T00:00:00.000Z",
    		venue: "Cannery Ballroom",
    		city: "Nashville",
    		state: "TN",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-09T00:00:00.000Z",
    		venue: "HI-FI Indy",
    		city: "Indianapolis",
    		state: "IN",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-10T00:00:00.000Z",
    		venue: "Musica",
    		city: "Akron",
    		state: "OH",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-11T00:00:00.000Z",
    		venue: "The Burl",
    		city: "Lexington",
    		state: "KY",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-12T00:00:00.000Z",
    		venue: "Mr. Smalls Theatre",
    		city: "Millvale",
    		state: "PA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2021-12-14T00:00:00.000Z",
    		venue: "Palladium Upstairs",
    		city: "Worcester",
    		state: "MA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-07T00:00:00.000Z",
    		venue: "The Loving Touch",
    		city: "Ferndale",
    		state: "MI",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-08T00:00:00.000Z",
    		venue: "The Pyramid Scheme",
    		city: "Grand Rapids",
    		state: "MI",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-09T00:00:00.000Z",
    		venue: "Lincoln Hall",
    		city: "Chicago",
    		state: "IL",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-10T00:00:00.000Z",
    		venue: "X-Ray Arcade",
    		city: "Cudahy",
    		state: "WI",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-11T00:00:00.000Z",
    		venue: "Fine Line Music Cafe",
    		city: "Minneapolis",
    		state: "MN",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-01-13T00:00:00.000Z",
    		venue: "Summit Music Hall",
    		city: "Denver",
    		state: "CO",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-03-19T00:00:00.000Z",
    		venue: "Neumos",
    		city: "Seattle",
    		state: "WA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-03-20T00:00:00.000Z",
    		venue: "Revolution Hall",
    		city: "Portland",
    		state: "OR",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-03-22T00:00:00.000Z",
    		venue: "Great American Music Hall",
    		city: "San Francisco",
    		state: "CA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	},
    	{
    		date: "2022-03-23T00:00:00.000Z",
    		venue: "The Regent Theater",
    		city: "Los Angeles",
    		state: "CA",
    		setlist: [
    			{
    				name: "[Untitled]",
    				tracks: [
    					{
    						name: "9:27a.m., 7/29",
    						preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    						preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 20
    					},
    					{
    						name: "Another Head for Hydra",
    						preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "[dormouse sighs]",
    						preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Winter Solstice",
    						preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flee, Thou Matadors!",
    						preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Tortoises All the Way Down",
    						preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "2,459 Miles",
    						preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wendy & Betsy",
    						preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "New Wine, New Skins",
    						preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Michael, Row Your Boat Ashore",
    						preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Break on Through (to the Other Side) [pt. Two]",
    						preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "[untitled] e.p.",
    				tracks: [
    					{
    						name: "Bethlehem, WV",
    						preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 17
    					},
    					{
    						name: "Winter Solstice (alt. version)",
    						preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dirty Air",
    						preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cities of the Plain",
    						preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Existential Dread, Six Hours’ Time",
    						preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "August 6th",
    						preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Kristy w/ the Sparkling Teeth",
    						preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses: Appendix",
    				tracks: [
    					{
    						name: "Hebrew Children",
    						preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Werewolf King (Demo)",
    						preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chapelcross Towns",
    						preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Chernobyl, 1985",
    						preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets (Revisited)",
    						preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen (Geology Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fairfield",
    						preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Red Cow (Golden Calf Version)",
    						preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Pale Horses",
    				tracks: [
    					{
    						name: "Pale Horse",
    						preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Watermelon Ascot",
    						preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "D-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Mexican War Streets",
    						preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 18
    					},
    					{
    						name: "Red Cow",
    						preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dorothy",
    						preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Blue Hen",
    						preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Lilac Queen",
    						preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Magic Lantern Days",
    						preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Birnam Wood",
    						preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Rainbow Signs",
    						preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
    					}
    				]
    			},
    			{
    				name: "Other Stories",
    				tracks: [
    					{
    						name: "Julian the Onion",
    						preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Fires",
    						preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "Ten Stories",
    				tracks: [
    					{
    						name: "February, 1878",
    						preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Grist for the Malady Mill",
    						preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "East Enders Wives",
    						preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cardiff Giant",
    						preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Elephant in the Dock",
    						preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fox's Dream of the Log Flume",
    						preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nine Stories",
    						preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fiji Mermaid",
    						preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bear's Vision of St. Agnes",
    						preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "All Circles",
    						preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    				tracks: [
    					{
    						name: "Every Thought A Thought Of You",
    						preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Fox, The Crow And The Cookie",
    						preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "The Angel Of Death Came To David's Room",
    						preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Goodbye, I!",
    						preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 14
    					},
    					{
    						name: "A Stick, A Carrot & String",
    						preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Bullet To Binary (Pt. Two)",
    						preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Timothy Hay",
    						preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Fig With A Bellyache",
    						preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Cattail Down",
    						preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The King Beetle On A Coconut Estate",
    						preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Allah, Allah, Allah",
    						preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 21
    					}
    				]
    			},
    			{
    				name: "Brother, Sister",
    				tracks: [
    					{
    						name: "Messes Of Men",
    						preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 2
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 3
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 4
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 5
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 8
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 9
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 12
    					}
    				]
    			},
    			{
    				name: "Catch For Us The Foxes",
    				tracks: [
    					{
    						name: "Torches Together",
    						preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 16
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 15
    					},
    					{
    						name: "Tie Me Up! Untie Me!",
    						preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Leaf",
    						preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Disaster Tourism",
    						preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Seven Sisters",
    						preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Carousels",
    						preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Son Of A Widow",
    						preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Ghost",
    						preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Nice And Blue",
    						preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Everything Was Beautiful And Nothing Hurt",
    						preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(A)",
    						preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Gentleman",
    						preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Be Still, Child",
    						preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "(B)",
    						preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Silencer",
    						preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Cure For Pain",
    						preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			},
    			{
    				name: "I Never Said That I Was Brave",
    				tracks: [
    					{
    						name: "I Never Said That I Was Brave",
    						preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Flamethrower",
    						preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Dying Is Strange and Hard",
    						preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "We Know Who Our Enemies Are",
    						preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Four Word Letter",
    						preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					}
    				]
    			}
    		]
    	}
    ];

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t0;
    	let intro;
    	let t1;
    	let div0;
    	let controls;
    	let t2;
    	let legend;
    	let t3;
    	let viz;
    	let t4;
    	let footer;
    	let div1;
    	let current;
    	header = new Header({ $$inline: true });
    	intro = new Intro({ $$inline: true });

    	controls = new Controls({
    			props: { colors: /*colors*/ ctx[0] },
    			$$inline: true
    		});

    	legend = new Legend({
    			props: { colors: /*colors*/ ctx[0] },
    			$$inline: true
    		});

    	viz = new Viz({
    			props: { shows, colors: /*colors*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(intro.$$.fragment);
    			t1 = space();
    			div0 = element("div");
    			create_component(controls.$$.fragment);
    			t2 = space();
    			create_component(legend.$$.fragment);
    			t3 = space();
    			create_component(viz.$$.fragment);
    			t4 = space();
    			footer = element("footer");
    			div1 = element("div");
    			div1.textContent = "Design and code by Jared Whalen | © 2022 Jared Whalen";
    			attr_dev(div0, "class", "side-by-side svelte-nt3t8g");
    			add_location(div0, file, 19, 2, 426);
    			attr_dev(main, "id", "App");
    			add_location(main, file, 15, 0, 384);
    			attr_dev(div1, "class", "svelte-nt3t8g");
    			add_location(div1, file, 29, 0, 558);
    			attr_dev(footer, "class", "svelte-nt3t8g");
    			add_location(footer, file, 28, 0, 549);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			mount_component(intro, main, null);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(controls, div0, null);
    			append_dev(div0, t2);
    			mount_component(legend, div0, null);
    			append_dev(main, t3);
    			mount_component(viz, main, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div1);
    			current = true;
    		},
    		p: noop,
    		i: function intro$1(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(intro.$$.fragment, local);
    			transition_in(controls.$$.fragment, local);
    			transition_in(legend.$$.fragment, local);
    			transition_in(viz.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(intro.$$.fragment, local);
    			transition_out(controls.$$.fragment, local);
    			transition_out(legend.$$.fragment, local);
    			transition_out(viz.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(intro);
    			destroy_component(controls);
    			destroy_component(legend);
    			destroy_component(viz);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let colors = ["#edf8b1", "#4d98cc"];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Meta,
    		Header,
    		Intro,
    		Legend,
    		Controls,
    		Viz,
    		shows,
    		colors
    	});

    	$$self.$inject_state = $$props => {
    		if ("colors" in $$props) $$invalidate(0, colors = $$props.colors);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [colors];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    let target = document.querySelector("body");

    // *** Use with Webflow ***
    // let target;
    // if ({"env":{"isProd":false}}.env.isProd) {
    //   target = document.querySelector("main");
    // } else {
    //   target = document.querySelector("body");
    // }
    const app = new App({
      target,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
