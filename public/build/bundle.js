
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
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
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
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
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
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

    /* src/Meta.svelte generated by Svelte v3.47.0 */
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
    	validate_slots('Meta', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Meta> was created with unknown prop '${key}'`);
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

    /* src/components/Header.svelte generated by Svelte v3.47.0 */

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
    			attr_dev(div0, "class", "svelte-118zvcj");
    			add_location(div0, file$7, 3, 2, 34);
    			attr_dev(div1, "class", "svelte-118zvcj");
    			add_location(div1, file$7, 4, 2, 51);
    			attr_dev(div2, "class", "svelte-118zvcj");
    			add_location(div2, file$7, 5, 2, 77);
    			attr_dev(span, "class", "svelte-118zvcj");
    			add_location(span, file$7, 6, 12, 111);
    			attr_dev(div3, "class", "svelte-118zvcj");
    			add_location(div3, file$7, 6, 2, 101);
    			attr_dev(div4, "class", "h-stack svelte-118zvcj");
    			add_location(div4, file$7, 2, 0, 10);
    			attr_dev(a0, "href", "https://jaredwhalen.com/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "svelte-118zvcj");
    			add_location(a0, file$7, 9, 44, 195);
    			attr_dev(div5, "class", "byline svelte-118zvcj");
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
    			attr_dev(svg0, "class", "svelte-118zvcj");
    			add_location(svg0, file$7, 13, 6, 364);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "href", "https://twitter.com/jared_whalen");
    			add_location(a1, file$7, 12, 4, 298);
    			attr_dev(path1, "d", "M249.88,233.65a16.29,16.29,0,0,0-5.15,31.75c.81.15,1.11-.35,1.11-.78s0-1.41,0-2.77c-4.53,1-5.49-2.19-5.49-2.19a4.3,4.3,0,0,0-1.81-2.38c-1.48-1,.11-1,.11-1a3.41,3.41,0,0,1,2.5,1.68,3.46,3.46,0,0,0,4.74,1.35,3.54,3.54,0,0,1,1-2.18c-3.61-.41-7.42-1.8-7.42-8a6.3,6.3,0,0,1,1.68-4.37,5.82,5.82,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.41,15.41,0,0,1,8.16,0c3.11-2.11,4.47-1.67,4.47-1.67a5.82,5.82,0,0,1,.16,4.31,6.26,6.26,0,0,1,1.68,4.37c0,6.26-3.81,7.64-7.44,8a3.91,3.91,0,0,1,1.11,3c0,2.18,0,3.93,0,4.47s.29.94,1.12.78a16.3,16.3,0,0,0-5.16-31.75Z");
    			attr_dev(path1, "transform", "translate(-233.59 -233.65)");
    			set_style(path1, "fill-rule", "evenodd");
    			add_location(path1, file$7, 23, 8, 1637);
    			attr_dev(svg1, "id", "github");
    			attr_dev(svg1, "data-name", "github");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 32.58 31.77");
    			attr_dev(svg1, "class", "svelte-118zvcj");
    			add_location(svg1, file$7, 22, 6, 1531);
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "href", "https://github.com/jaredwhalen/mwy-farewell-tracker");
    			add_location(a2, file$7, 21, 4, 1446);
    			attr_dev(div6, "class", "g-share svelte-118zvcj");
    			add_location(div6, file$7, 11, 2, 272);
    			attr_dev(header, "class", "svelte-118zvcj");
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
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
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
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
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
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
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

    const isMobile = derived(windowWidth,
        $windowWidth => $windowWidth <= 560 ? true : false
    );

    derived(windowWidth,
        $windowWidth => $windowWidth > 1200 ? true : false
    );

    const volume = writable([0]);

    /* src/components/Intro.svelte generated by Svelte v3.47.0 */
    const file$6 = "src/components/Intro.svelte";

    // (13:64) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Hover over");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(13:64) {:else}",
    		ctx
    	});

    	return block;
    }

    // (13:42) {#if $isMobile}
    function create_if_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Tap on");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(13:42) {#if $isMobile}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let p0;
    	let span;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let a0;
    	let a0_src_value;
    	let t5;
    	let t6;
    	let t7;
    	let p2;
    	let t8;
    	let a1;

    	function select_block_type(ctx, dirty) {
    		if (/*$isMobile*/ ctx[0]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			span = element("span");
    			span.textContent = "H";
    			t1 = text("aving released seven studio albums and five EPs over two decades, mewithoutYou has plenty of songs to choose from when planning the setlists for each night of their farewell tour. Fans of the band know\n    that historically setlist can vary greatly from night to night. Even on their “Brother, Sister” anniversary tour where they band played the album in full, with lengthy encores they managed to not repeat the\n    same setlist twice.");
    			t2 = space();
    			p1 = element("p");
    			t3 = text("To visualize this assortment (and just as an opportunity to geek out about an amazing band), I am using ");
    			a0 = element("a");
    			a0.textContent = "setlist.fm";
    			t5 = text(" data to visualize what songs the band plays on each night. The color indicates the\n    position in the set a song is played. ");
    			if_block.c();
    			t6 = text(" a square to listen to the song and see that show's entire setlist. This app will update as new setlists become available.");
    			t7 = space();
    			p2 = element("p");
    			t8 = text("See anything off? Haves ideas to make this better? Send me an email at ");
    			a1 = element("a");
    			a1.textContent = "jared.m.whalen@gmail.com";
    			attr_dev(span, "class", "firstcharacter svelte-1vzk9u0");
    			add_location(span, file$6, 7, 5, 91);
    			attr_dev(p0, "class", "svelte-1vzk9u0");
    			add_location(p0, file$6, 7, 2, 88);
    			attr_dev(a0, "target", "_blank");
    			if (!src_url_equal(a0.src, a0_src_value = "https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html")) attr_dev(a0, "src", a0_src_value);
    			add_location(a0, file$6, 11, 109, 679);
    			attr_dev(p1, "class", "svelte-1vzk9u0");
    			add_location(p1, file$6, 11, 2, 572);
    			attr_dev(a1, "href", "mailto:jared.m.whalen@gmail.com");
    			add_location(a1, file$6, 14, 76, 1151);
    			attr_dev(p2, "class", "svelte-1vzk9u0");
    			add_location(p2, file$6, 14, 2, 1077);
    			attr_dev(div, "class", "intro svelte-1vzk9u0");
    			add_location(div, file$6, 5, 0, 65);
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
    			append_dev(p1, a0);
    			append_dev(p1, t5);
    			if_block.m(p1, null);
    			append_dev(p1, t6);
    			append_dev(div, t7);
    			append_dev(div, p2);
    			append_dev(p2, t8);
    			append_dev(p2, a1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(p1, t6);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
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

    function instance$6($$self, $$props, $$invalidate) {
    	let $isMobile;
    	validate_store(isMobile, 'isMobile');
    	component_subscribe($$self, isMobile, $$value => $$invalidate(0, $isMobile = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Intro', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Intro> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ isMobile, $isMobile });
    	return [$isMobile];
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

    /* src/components/Legend.svelte generated by Svelte v3.47.0 */

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
    	validate_slots('Legend', slots, []);
    	let { colors } = $$props;
    	const writable_props = ['colors'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Legend> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('colors' in $$props) $$invalidate(0, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({ colors });

    	$$self.$inject_state = $$props => {
    		if ('colors' in $$props) $$invalidate(0, colors = $$props.colors);
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

    		if (/*colors*/ ctx[0] === undefined && !('colors' in props)) {
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

    /* node_modules/@bulatdashiev/svelte-slider/src/Thumb.svelte generated by Svelte v3.47.0 */
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
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
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
    	validate_slots('Thumb', slots, ['default']);
    	const dispatch = createEventDispatcher();
    	let active;
    	let { pos } = $$props;
    	const writable_props = ['pos'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Thumb> was created with unknown prop '${key}'`);
    	});

    	const dragstart_handler = () => ($$invalidate(1, active = true), dispatch('active', true));
    	const drag_handler = ({ detail: v }) => $$invalidate(0, pos = v);
    	const dragend_handler = () => ($$invalidate(1, active = false), dispatch('active', false));

    	$$self.$$set = $$props => {
    		if ('pos' in $$props) $$invalidate(0, pos = $$props.pos);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		handle,
    		dispatch,
    		pos,
    		active
    	});

    	$$self.$inject_state = $$props => {
    		if ('pos' in $$props) $$invalidate(0, pos = $$props.pos);
    		if ('active' in $$props) $$invalidate(1, active = $$props.active);
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

    		if (/*pos*/ ctx[0] === undefined && !('pos' in props)) {
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

    /* node_modules/@bulatdashiev/svelte-slider/src/Slider.svelte generated by Svelte v3.47.0 */
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
    			if (dirty & /*value*/ 1 && input_value_value !== (input_value_value = /*value*/ ctx[0][1]) && input.value !== input_value_value) {
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
    		p: noop,
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
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
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
    					update_slot_base(
    						left_slot,
    						left_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(left_slot_template, /*$$scope*/ ctx[15], dirty, get_left_slot_changes),
    						get_left_slot_context
    					);
    				}
    			} else {
    				if (left_slot_or_fallback && left_slot_or_fallback.p && (!current || dirty & /*$$scope*/ 32768)) {
    					left_slot_or_fallback.p(ctx, !current ? -1 : dirty);
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
    	binding_callbacks.push(() => bind(thumb, 'pos', thumb_pos_binding_1));
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
    		p: noop,
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
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
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
    					update_slot_base(
    						right_slot,
    						right_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(right_slot_template, /*$$scope*/ ctx[15], dirty, get_right_slot_changes),
    						get_right_slot_context
    					);
    				}
    			} else {
    				if (right_slot_or_fallback && right_slot_or_fallback.p && (!current || dirty & /*$$scope*/ 32768)) {
    					right_slot_or_fallback.p(ctx, !current ? -1 : dirty);
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
    	binding_callbacks.push(() => bind(thumb, 'pos', thumb_pos_binding));
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
    			if (!current || dirty & /*value*/ 1 && input_value_value !== (input_value_value = /*value*/ ctx[0][0]) && input.value !== input_value_value) {
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
    	validate_slots('Slider', slots, ['default','left','right']);
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

    	const writable_props = ['name', 'range', 'min', 'max', 'step', 'value', 'order'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Slider> was created with unknown prop '${key}'`);
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
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    		if ('range' in $$props) $$invalidate(2, range = $$props.range);
    		if ('min' in $$props) $$invalidate(6, min = $$props.min);
    		if ('max' in $$props) $$invalidate(7, max = $$props.max);
    		if ('step' in $$props) $$invalidate(8, step = $$props.step);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('order' in $$props) $$invalidate(9, order = $$props.order);
    		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
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
    		if ('name' in $$props) $$invalidate(1, name = $$props.name);
    		if ('range' in $$props) $$invalidate(2, range = $$props.range);
    		if ('min' in $$props) $$invalidate(6, min = $$props.min);
    		if ('max' in $$props) $$invalidate(7, max = $$props.max);
    		if ('step' in $$props) $$invalidate(8, step = $$props.step);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('pos' in $$props) $$invalidate(3, pos = $$props.pos);
    		if ('active' in $$props) $$invalidate(4, active = $$props.active);
    		if ('order' in $$props) $$invalidate(9, order = $$props.order);
    		if ('progress' in $$props) $$invalidate(5, progress = $$props.progress);
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

    /* src/components/Controls.svelte generated by Svelte v3.47.0 */
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
    		p: noop,
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
    	binding_callbacks.push(() => bind(slider, 'value', slider_value_binding));

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
    	validate_store(volume, 'volume');
    	component_subscribe($$self, volume, $$value => $$invalidate(0, $volume = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Controls', slots, []);
    	let { colors } = $$props;
    	const writable_props = ['colors'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Controls> was created with unknown prop '${key}'`);
    	});

    	function slider_value_binding(value) {
    		$volume = value;
    		volume.set($volume);
    	}

    	$$self.$$set = $$props => {
    		if ('colors' in $$props) $$invalidate(1, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({ Slider, volume, colors, $volume });

    	$$self.$inject_state = $$props => {
    		if ('colors' in $$props) $$invalidate(1, colors = $$props.colors);
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

    		if (/*colors*/ ctx[1] === undefined && !('colors' in props)) {
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

    var top = 'top';
    var bottom = 'bottom';
    var right = 'right';
    var left = 'left';
    var auto = 'auto';
    var basePlacements = [top, bottom, right, left];
    var start = 'start';
    var end = 'end';
    var clippingParents = 'clippingParents';
    var viewport = 'viewport';
    var popper = 'popper';
    var reference = 'reference';
    var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
      return acc.concat([placement + "-" + start, placement + "-" + end]);
    }, []);
    var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
      return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
    }, []); // modifiers that need to read the DOM

    var beforeRead = 'beforeRead';
    var read = 'read';
    var afterRead = 'afterRead'; // pure-logic modifiers

    var beforeMain = 'beforeMain';
    var main = 'main';
    var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

    var beforeWrite = 'beforeWrite';
    var write = 'write';
    var afterWrite = 'afterWrite';
    var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

    function getNodeName(element) {
      return element ? (element.nodeName || '').toLowerCase() : null;
    }

    function getWindow(node) {
      if (node == null) {
        return window;
      }

      if (node.toString() !== '[object Window]') {
        var ownerDocument = node.ownerDocument;
        return ownerDocument ? ownerDocument.defaultView || window : window;
      }

      return node;
    }

    function isElement$1(node) {
      var OwnElement = getWindow(node).Element;
      return node instanceof OwnElement || node instanceof Element;
    }

    function isHTMLElement(node) {
      var OwnElement = getWindow(node).HTMLElement;
      return node instanceof OwnElement || node instanceof HTMLElement;
    }

    function isShadowRoot(node) {
      // IE 11 has no ShadowRoot
      if (typeof ShadowRoot === 'undefined') {
        return false;
      }

      var OwnElement = getWindow(node).ShadowRoot;
      return node instanceof OwnElement || node instanceof ShadowRoot;
    }

    // and applies them to the HTMLElements such as popper and arrow

    function applyStyles(_ref) {
      var state = _ref.state;
      Object.keys(state.elements).forEach(function (name) {
        var style = state.styles[name] || {};
        var attributes = state.attributes[name] || {};
        var element = state.elements[name]; // arrow is optional + virtual elements

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        } // Flow doesn't support to extend this property, but it's the most
        // effective way to apply styles to an HTMLElement
        // $FlowFixMe[cannot-write]


        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function (name) {
          var value = attributes[name];

          if (value === false) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, value === true ? '' : value);
          }
        });
      });
    }

    function effect$2(_ref2) {
      var state = _ref2.state;
      var initialStyles = {
        popper: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        arrow: {
          position: 'absolute'
        },
        reference: {}
      };
      Object.assign(state.elements.popper.style, initialStyles.popper);
      state.styles = initialStyles;

      if (state.elements.arrow) {
        Object.assign(state.elements.arrow.style, initialStyles.arrow);
      }

      return function () {
        Object.keys(state.elements).forEach(function (name) {
          var element = state.elements[name];
          var attributes = state.attributes[name] || {};
          var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

          var style = styleProperties.reduce(function (style, property) {
            style[property] = '';
            return style;
          }, {}); // arrow is optional + virtual elements

          if (!isHTMLElement(element) || !getNodeName(element)) {
            return;
          }

          Object.assign(element.style, style);
          Object.keys(attributes).forEach(function (attribute) {
            element.removeAttribute(attribute);
          });
        });
      };
    } // eslint-disable-next-line import/no-unused-modules


    var applyStyles$1 = {
      name: 'applyStyles',
      enabled: true,
      phase: 'write',
      fn: applyStyles,
      effect: effect$2,
      requires: ['computeStyles']
    };

    function getBasePlacement$1(placement) {
      return placement.split('-')[0];
    }

    var max = Math.max;
    var min = Math.min;
    var round = Math.round;

    function getBoundingClientRect(element, includeScale) {
      if (includeScale === void 0) {
        includeScale = false;
      }

      var rect = element.getBoundingClientRect();
      var scaleX = 1;
      var scaleY = 1;

      if (isHTMLElement(element) && includeScale) {
        var offsetHeight = element.offsetHeight;
        var offsetWidth = element.offsetWidth; // Do not attempt to divide by 0, otherwise we get `Infinity` as scale
        // Fallback to 1 in case both values are `0`

        if (offsetWidth > 0) {
          scaleX = round(rect.width) / offsetWidth || 1;
        }

        if (offsetHeight > 0) {
          scaleY = round(rect.height) / offsetHeight || 1;
        }
      }

      return {
        width: rect.width / scaleX,
        height: rect.height / scaleY,
        top: rect.top / scaleY,
        right: rect.right / scaleX,
        bottom: rect.bottom / scaleY,
        left: rect.left / scaleX,
        x: rect.left / scaleX,
        y: rect.top / scaleY
      };
    }

    // means it doesn't take into account transforms.

    function getLayoutRect(element) {
      var clientRect = getBoundingClientRect(element); // Use the clientRect sizes if it's not been transformed.
      // Fixes https://github.com/popperjs/popper-core/issues/1223

      var width = element.offsetWidth;
      var height = element.offsetHeight;

      if (Math.abs(clientRect.width - width) <= 1) {
        width = clientRect.width;
      }

      if (Math.abs(clientRect.height - height) <= 1) {
        height = clientRect.height;
      }

      return {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: width,
        height: height
      };
    }

    function contains(parent, child) {
      var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

      if (parent.contains(child)) {
        return true;
      } // then fallback to custom implementation with Shadow DOM support
      else if (rootNode && isShadowRoot(rootNode)) {
          var next = child;

          do {
            if (next && parent.isSameNode(next)) {
              return true;
            } // $FlowFixMe[prop-missing]: need a better way to handle this...


            next = next.parentNode || next.host;
          } while (next);
        } // Give up, the result is false


      return false;
    }

    function getComputedStyle(element) {
      return getWindow(element).getComputedStyle(element);
    }

    function isTableElement(element) {
      return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
    }

    function getDocumentElement(element) {
      // $FlowFixMe[incompatible-return]: assume body is always available
      return ((isElement$1(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
      element.document) || window.document).documentElement;
    }

    function getParentNode(element) {
      if (getNodeName(element) === 'html') {
        return element;
      }

      return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
        // $FlowFixMe[incompatible-return]
        // $FlowFixMe[prop-missing]
        element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
        element.parentNode || ( // DOM Element detected
        isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
        // $FlowFixMe[incompatible-call]: HTMLElement is a Node
        getDocumentElement(element) // fallback

      );
    }

    function getTrueOffsetParent(element) {
      if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
      getComputedStyle(element).position === 'fixed') {
        return null;
      }

      return element.offsetParent;
    } // `.offsetParent` reports `null` for fixed elements, while absolute elements
    // return the containing block


    function getContainingBlock(element) {
      var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
      var isIE = navigator.userAgent.indexOf('Trident') !== -1;

      if (isIE && isHTMLElement(element)) {
        // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
        var elementCss = getComputedStyle(element);

        if (elementCss.position === 'fixed') {
          return null;
        }
      }

      var currentNode = getParentNode(element);

      if (isShadowRoot(currentNode)) {
        currentNode = currentNode.host;
      }

      while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
        var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
        // create a containing block.
        // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

        if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
          return currentNode;
        } else {
          currentNode = currentNode.parentNode;
        }
      }

      return null;
    } // Gets the closest ancestor positioned element. Handles some edge cases,
    // such as table ancestors and cross browser bugs.


    function getOffsetParent(element) {
      var window = getWindow(element);
      var offsetParent = getTrueOffsetParent(element);

      while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
        offsetParent = getTrueOffsetParent(offsetParent);
      }

      if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static')) {
        return window;
      }

      return offsetParent || getContainingBlock(element) || window;
    }

    function getMainAxisFromPlacement(placement) {
      return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
    }

    function within(min$1, value, max$1) {
      return max(min$1, min(value, max$1));
    }
    function withinMaxClamp(min, value, max) {
      var v = within(min, value, max);
      return v > max ? max : v;
    }

    function getFreshSideObject() {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }

    function mergePaddingObject(paddingObject) {
      return Object.assign({}, getFreshSideObject(), paddingObject);
    }

    function expandToHashMap(value, keys) {
      return keys.reduce(function (hashMap, key) {
        hashMap[key] = value;
        return hashMap;
      }, {});
    }

    var toPaddingObject = function toPaddingObject(padding, state) {
      padding = typeof padding === 'function' ? padding(Object.assign({}, state.rects, {
        placement: state.placement
      })) : padding;
      return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
    };

    function arrow(_ref) {
      var _state$modifiersData$;

      var state = _ref.state,
          name = _ref.name,
          options = _ref.options;
      var arrowElement = state.elements.arrow;
      var popperOffsets = state.modifiersData.popperOffsets;
      var basePlacement = getBasePlacement$1(state.placement);
      var axis = getMainAxisFromPlacement(basePlacement);
      var isVertical = [left, right].indexOf(basePlacement) >= 0;
      var len = isVertical ? 'height' : 'width';

      if (!arrowElement || !popperOffsets) {
        return;
      }

      var paddingObject = toPaddingObject(options.padding, state);
      var arrowRect = getLayoutRect(arrowElement);
      var minProp = axis === 'y' ? top : left;
      var maxProp = axis === 'y' ? bottom : right;
      var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
      var startDiff = popperOffsets[axis] - state.rects.reference[axis];
      var arrowOffsetParent = getOffsetParent(arrowElement);
      var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
      var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
      // outside of the popper bounds

      var min = paddingObject[minProp];
      var max = clientSize - arrowRect[len] - paddingObject[maxProp];
      var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
      var offset = within(min, center, max); // Prevents breaking syntax highlighting...

      var axisProp = axis;
      state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
    }

    function effect$1(_ref2) {
      var state = _ref2.state,
          options = _ref2.options;
      var _options$element = options.element,
          arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element;

      if (arrowElement == null) {
        return;
      } // CSS selector


      if (typeof arrowElement === 'string') {
        arrowElement = state.elements.popper.querySelector(arrowElement);

        if (!arrowElement) {
          return;
        }
      }

      if (!contains(state.elements.popper, arrowElement)) {

        return;
      }

      state.elements.arrow = arrowElement;
    } // eslint-disable-next-line import/no-unused-modules


    var arrow$1 = {
      name: 'arrow',
      enabled: true,
      phase: 'main',
      fn: arrow,
      effect: effect$1,
      requires: ['popperOffsets'],
      requiresIfExists: ['preventOverflow']
    };

    function getVariation(placement) {
      return placement.split('-')[1];
    }

    var unsetSides = {
      top: 'auto',
      right: 'auto',
      bottom: 'auto',
      left: 'auto'
    }; // Round the offsets to the nearest suitable subpixel based on the DPR.
    // Zooming can change the DPR, but it seems to report a value that will
    // cleanly divide the values into the appropriate subpixels.

    function roundOffsetsByDPR(_ref) {
      var x = _ref.x,
          y = _ref.y;
      var win = window;
      var dpr = win.devicePixelRatio || 1;
      return {
        x: round(x * dpr) / dpr || 0,
        y: round(y * dpr) / dpr || 0
      };
    }

    function mapToStyles(_ref2) {
      var _Object$assign2;

      var popper = _ref2.popper,
          popperRect = _ref2.popperRect,
          placement = _ref2.placement,
          variation = _ref2.variation,
          offsets = _ref2.offsets,
          position = _ref2.position,
          gpuAcceleration = _ref2.gpuAcceleration,
          adaptive = _ref2.adaptive,
          roundOffsets = _ref2.roundOffsets,
          isFixed = _ref2.isFixed;
      var _offsets$x = offsets.x,
          x = _offsets$x === void 0 ? 0 : _offsets$x,
          _offsets$y = offsets.y,
          y = _offsets$y === void 0 ? 0 : _offsets$y;

      var _ref3 = typeof roundOffsets === 'function' ? roundOffsets({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref3.x;
      y = _ref3.y;
      var hasX = offsets.hasOwnProperty('x');
      var hasY = offsets.hasOwnProperty('y');
      var sideX = left;
      var sideY = top;
      var win = window;

      if (adaptive) {
        var offsetParent = getOffsetParent(popper);
        var heightProp = 'clientHeight';
        var widthProp = 'clientWidth';

        if (offsetParent === getWindow(popper)) {
          offsetParent = getDocumentElement(popper);

          if (getComputedStyle(offsetParent).position !== 'static' && position === 'absolute') {
            heightProp = 'scrollHeight';
            widthProp = 'scrollWidth';
          }
        } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it


        offsetParent = offsetParent;

        if (placement === top || (placement === left || placement === right) && variation === end) {
          sideY = bottom;
          var offsetY = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.height : // $FlowFixMe[prop-missing]
          offsetParent[heightProp];
          y -= offsetY - popperRect.height;
          y *= gpuAcceleration ? 1 : -1;
        }

        if (placement === left || (placement === top || placement === bottom) && variation === end) {
          sideX = right;
          var offsetX = isFixed && offsetParent === win && win.visualViewport ? win.visualViewport.width : // $FlowFixMe[prop-missing]
          offsetParent[widthProp];
          x -= offsetX - popperRect.width;
          x *= gpuAcceleration ? 1 : -1;
        }
      }

      var commonStyles = Object.assign({
        position: position
      }, adaptive && unsetSides);

      var _ref4 = roundOffsets === true ? roundOffsetsByDPR({
        x: x,
        y: y
      }) : {
        x: x,
        y: y
      };

      x = _ref4.x;
      y = _ref4.y;

      if (gpuAcceleration) {
        var _Object$assign;

        return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) <= 1 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
      }

      return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
    }

    function computeStyles(_ref5) {
      var state = _ref5.state,
          options = _ref5.options;
      var _options$gpuAccelerat = options.gpuAcceleration,
          gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
          _options$adaptive = options.adaptive,
          adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
          _options$roundOffsets = options.roundOffsets,
          roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

      var commonStyles = {
        placement: getBasePlacement$1(state.placement),
        variation: getVariation(state.placement),
        popper: state.elements.popper,
        popperRect: state.rects.popper,
        gpuAcceleration: gpuAcceleration,
        isFixed: state.options.strategy === 'fixed'
      };

      if (state.modifiersData.popperOffsets != null) {
        state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.popperOffsets,
          position: state.options.strategy,
          adaptive: adaptive,
          roundOffsets: roundOffsets
        })));
      }

      if (state.modifiersData.arrow != null) {
        state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
          offsets: state.modifiersData.arrow,
          position: 'absolute',
          adaptive: false,
          roundOffsets: roundOffsets
        })));
      }

      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-placement': state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var computeStyles$1 = {
      name: 'computeStyles',
      enabled: true,
      phase: 'beforeWrite',
      fn: computeStyles,
      data: {}
    };

    var passive = {
      passive: true
    };

    function effect(_ref) {
      var state = _ref.state,
          instance = _ref.instance,
          options = _ref.options;
      var _options$scroll = options.scroll,
          scroll = _options$scroll === void 0 ? true : _options$scroll,
          _options$resize = options.resize,
          resize = _options$resize === void 0 ? true : _options$resize;
      var window = getWindow(state.elements.popper);
      var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

      if (scroll) {
        scrollParents.forEach(function (scrollParent) {
          scrollParent.addEventListener('scroll', instance.update, passive);
        });
      }

      if (resize) {
        window.addEventListener('resize', instance.update, passive);
      }

      return function () {
        if (scroll) {
          scrollParents.forEach(function (scrollParent) {
            scrollParent.removeEventListener('scroll', instance.update, passive);
          });
        }

        if (resize) {
          window.removeEventListener('resize', instance.update, passive);
        }
      };
    } // eslint-disable-next-line import/no-unused-modules


    var eventListeners = {
      name: 'eventListeners',
      enabled: true,
      phase: 'write',
      fn: function fn() {},
      effect: effect,
      data: {}
    };

    var hash$1 = {
      left: 'right',
      right: 'left',
      bottom: 'top',
      top: 'bottom'
    };
    function getOppositePlacement(placement) {
      return placement.replace(/left|right|bottom|top/g, function (matched) {
        return hash$1[matched];
      });
    }

    var hash = {
      start: 'end',
      end: 'start'
    };
    function getOppositeVariationPlacement(placement) {
      return placement.replace(/start|end/g, function (matched) {
        return hash[matched];
      });
    }

    function getWindowScroll(node) {
      var win = getWindow(node);
      var scrollLeft = win.pageXOffset;
      var scrollTop = win.pageYOffset;
      return {
        scrollLeft: scrollLeft,
        scrollTop: scrollTop
      };
    }

    function getWindowScrollBarX(element) {
      // If <html> has a CSS width greater than the viewport, then this will be
      // incorrect for RTL.
      // Popper 1 is broken in this case and never had a bug report so let's assume
      // it's not an issue. I don't think anyone ever specifies width on <html>
      // anyway.
      // Browsers where the left scrollbar doesn't cause an issue report `0` for
      // this (e.g. Edge 2019, IE11, Safari)
      return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
    }

    function getViewportRect(element) {
      var win = getWindow(element);
      var html = getDocumentElement(element);
      var visualViewport = win.visualViewport;
      var width = html.clientWidth;
      var height = html.clientHeight;
      var x = 0;
      var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
      // can be obscured underneath it.
      // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
      // if it isn't open, so if this isn't available, the popper will be detected
      // to overflow the bottom of the screen too early.

      if (visualViewport) {
        width = visualViewport.width;
        height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
        // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
        // errors due to floating point numbers, so we need to check precision.
        // Safari returns a number <= 0, usually < -1 when pinch-zoomed
        // Feature detection fails in mobile emulation mode in Chrome.
        // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
        // 0.001
        // Fallback here: "Not Safari" userAgent

        if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
          x = visualViewport.offsetLeft;
          y = visualViewport.offsetTop;
        }
      }

      return {
        width: width,
        height: height,
        x: x + getWindowScrollBarX(element),
        y: y
      };
    }

    // of the `<html>` and `<body>` rect bounds if horizontally scrollable

    function getDocumentRect(element) {
      var _element$ownerDocumen;

      var html = getDocumentElement(element);
      var winScroll = getWindowScroll(element);
      var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
      var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
      var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
      var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
      var y = -winScroll.scrollTop;

      if (getComputedStyle(body || html).direction === 'rtl') {
        x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
      }

      return {
        width: width,
        height: height,
        x: x,
        y: y
      };
    }

    function isScrollParent(element) {
      // Firefox wants us to check `-x` and `-y` variations as well
      var _getComputedStyle = getComputedStyle(element),
          overflow = _getComputedStyle.overflow,
          overflowX = _getComputedStyle.overflowX,
          overflowY = _getComputedStyle.overflowY;

      return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
    }

    function getScrollParent(node) {
      if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
        // $FlowFixMe[incompatible-return]: assume body is always available
        return node.ownerDocument.body;
      }

      if (isHTMLElement(node) && isScrollParent(node)) {
        return node;
      }

      return getScrollParent(getParentNode(node));
    }

    /*
    given a DOM element, return the list of all scroll parents, up the list of ancesors
    until we get to the top window object. This list is what we attach scroll listeners
    to, because if any of these parent elements scroll, we'll need to re-calculate the
    reference element's position.
    */

    function listScrollParents(element, list) {
      var _element$ownerDocumen;

      if (list === void 0) {
        list = [];
      }

      var scrollParent = getScrollParent(element);
      var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
      var win = getWindow(scrollParent);
      var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
      var updatedList = list.concat(target);
      return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
      updatedList.concat(listScrollParents(getParentNode(target)));
    }

    function rectToClientRect(rect) {
      return Object.assign({}, rect, {
        left: rect.x,
        top: rect.y,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height
      });
    }

    function getInnerBoundingClientRect(element) {
      var rect = getBoundingClientRect(element);
      rect.top = rect.top + element.clientTop;
      rect.left = rect.left + element.clientLeft;
      rect.bottom = rect.top + element.clientHeight;
      rect.right = rect.left + element.clientWidth;
      rect.width = element.clientWidth;
      rect.height = element.clientHeight;
      rect.x = rect.left;
      rect.y = rect.top;
      return rect;
    }

    function getClientRectFromMixedType(element, clippingParent) {
      return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isElement$1(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
    } // A "clipping parent" is an overflowable container with the characteristic of
    // clipping (or hiding) overflowing elements with a position different from
    // `initial`


    function getClippingParents(element) {
      var clippingParents = listScrollParents(getParentNode(element));
      var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
      var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

      if (!isElement$1(clipperElement)) {
        return [];
      } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


      return clippingParents.filter(function (clippingParent) {
        return isElement$1(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
      });
    } // Gets the maximum area that the element is visible in due to any number of
    // clipping parents


    function getClippingRect(element, boundary, rootBoundary) {
      var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
      var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
      var firstClippingParent = clippingParents[0];
      var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
        var rect = getClientRectFromMixedType(element, clippingParent);
        accRect.top = max(rect.top, accRect.top);
        accRect.right = min(rect.right, accRect.right);
        accRect.bottom = min(rect.bottom, accRect.bottom);
        accRect.left = max(rect.left, accRect.left);
        return accRect;
      }, getClientRectFromMixedType(element, firstClippingParent));
      clippingRect.width = clippingRect.right - clippingRect.left;
      clippingRect.height = clippingRect.bottom - clippingRect.top;
      clippingRect.x = clippingRect.left;
      clippingRect.y = clippingRect.top;
      return clippingRect;
    }

    function computeOffsets(_ref) {
      var reference = _ref.reference,
          element = _ref.element,
          placement = _ref.placement;
      var basePlacement = placement ? getBasePlacement$1(placement) : null;
      var variation = placement ? getVariation(placement) : null;
      var commonX = reference.x + reference.width / 2 - element.width / 2;
      var commonY = reference.y + reference.height / 2 - element.height / 2;
      var offsets;

      switch (basePlacement) {
        case top:
          offsets = {
            x: commonX,
            y: reference.y - element.height
          };
          break;

        case bottom:
          offsets = {
            x: commonX,
            y: reference.y + reference.height
          };
          break;

        case right:
          offsets = {
            x: reference.x + reference.width,
            y: commonY
          };
          break;

        case left:
          offsets = {
            x: reference.x - element.width,
            y: commonY
          };
          break;

        default:
          offsets = {
            x: reference.x,
            y: reference.y
          };
      }

      var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

      if (mainAxis != null) {
        var len = mainAxis === 'y' ? 'height' : 'width';

        switch (variation) {
          case start:
            offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
            break;

          case end:
            offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
            break;
        }
      }

      return offsets;
    }

    function detectOverflow(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          _options$placement = _options.placement,
          placement = _options$placement === void 0 ? state.placement : _options$placement,
          _options$boundary = _options.boundary,
          boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
          _options$rootBoundary = _options.rootBoundary,
          rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
          _options$elementConte = _options.elementContext,
          elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
          _options$altBoundary = _options.altBoundary,
          altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
          _options$padding = _options.padding,
          padding = _options$padding === void 0 ? 0 : _options$padding;
      var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
      var altContext = elementContext === popper ? reference : popper;
      var popperRect = state.rects.popper;
      var element = state.elements[altBoundary ? altContext : elementContext];
      var clippingClientRect = getClippingRect(isElement$1(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
      var referenceClientRect = getBoundingClientRect(state.elements.reference);
      var popperOffsets = computeOffsets({
        reference: referenceClientRect,
        element: popperRect,
        strategy: 'absolute',
        placement: placement
      });
      var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
      var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
      // 0 or negative = within the clipping rect

      var overflowOffsets = {
        top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
        bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
        left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
        right: elementClientRect.right - clippingClientRect.right + paddingObject.right
      };
      var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

      if (elementContext === popper && offsetData) {
        var offset = offsetData[placement];
        Object.keys(overflowOffsets).forEach(function (key) {
          var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
          var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
          overflowOffsets[key] += offset[axis] * multiply;
        });
      }

      return overflowOffsets;
    }

    function computeAutoPlacement(state, options) {
      if (options === void 0) {
        options = {};
      }

      var _options = options,
          placement = _options.placement,
          boundary = _options.boundary,
          rootBoundary = _options.rootBoundary,
          padding = _options.padding,
          flipVariations = _options.flipVariations,
          _options$allowedAutoP = _options.allowedAutoPlacements,
          allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
      var variation = getVariation(placement);
      var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
        return getVariation(placement) === variation;
      }) : basePlacements;
      var allowedPlacements = placements$1.filter(function (placement) {
        return allowedAutoPlacements.indexOf(placement) >= 0;
      });

      if (allowedPlacements.length === 0) {
        allowedPlacements = placements$1;
      } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


      var overflows = allowedPlacements.reduce(function (acc, placement) {
        acc[placement] = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding
        })[getBasePlacement$1(placement)];
        return acc;
      }, {});
      return Object.keys(overflows).sort(function (a, b) {
        return overflows[a] - overflows[b];
      });
    }

    function getExpandedFallbackPlacements(placement) {
      if (getBasePlacement$1(placement) === auto) {
        return [];
      }

      var oppositePlacement = getOppositePlacement(placement);
      return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
    }

    function flip(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;

      if (state.modifiersData[name]._skip) {
        return;
      }

      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
          specifiedFallbackPlacements = options.fallbackPlacements,
          padding = options.padding,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          _options$flipVariatio = options.flipVariations,
          flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
          allowedAutoPlacements = options.allowedAutoPlacements;
      var preferredPlacement = state.options.placement;
      var basePlacement = getBasePlacement$1(preferredPlacement);
      var isBasePlacement = basePlacement === preferredPlacement;
      var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
      var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
        return acc.concat(getBasePlacement$1(placement) === auto ? computeAutoPlacement(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          padding: padding,
          flipVariations: flipVariations,
          allowedAutoPlacements: allowedAutoPlacements
        }) : placement);
      }, []);
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var checksMap = new Map();
      var makeFallbackChecks = true;
      var firstFittingPlacement = placements[0];

      for (var i = 0; i < placements.length; i++) {
        var placement = placements[i];

        var _basePlacement = getBasePlacement$1(placement);

        var isStartVariation = getVariation(placement) === start;
        var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
        var len = isVertical ? 'width' : 'height';
        var overflow = detectOverflow(state, {
          placement: placement,
          boundary: boundary,
          rootBoundary: rootBoundary,
          altBoundary: altBoundary,
          padding: padding
        });
        var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

        if (referenceRect[len] > popperRect[len]) {
          mainVariationSide = getOppositePlacement(mainVariationSide);
        }

        var altVariationSide = getOppositePlacement(mainVariationSide);
        var checks = [];

        if (checkMainAxis) {
          checks.push(overflow[_basePlacement] <= 0);
        }

        if (checkAltAxis) {
          checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
        }

        if (checks.every(function (check) {
          return check;
        })) {
          firstFittingPlacement = placement;
          makeFallbackChecks = false;
          break;
        }

        checksMap.set(placement, checks);
      }

      if (makeFallbackChecks) {
        // `2` may be desired in some cases – research later
        var numberOfChecks = flipVariations ? 3 : 1;

        var _loop = function _loop(_i) {
          var fittingPlacement = placements.find(function (placement) {
            var checks = checksMap.get(placement);

            if (checks) {
              return checks.slice(0, _i).every(function (check) {
                return check;
              });
            }
          });

          if (fittingPlacement) {
            firstFittingPlacement = fittingPlacement;
            return "break";
          }
        };

        for (var _i = numberOfChecks; _i > 0; _i--) {
          var _ret = _loop(_i);

          if (_ret === "break") break;
        }
      }

      if (state.placement !== firstFittingPlacement) {
        state.modifiersData[name]._skip = true;
        state.placement = firstFittingPlacement;
        state.reset = true;
      }
    } // eslint-disable-next-line import/no-unused-modules


    var flip$1 = {
      name: 'flip',
      enabled: true,
      phase: 'main',
      fn: flip,
      requiresIfExists: ['offset'],
      data: {
        _skip: false
      }
    };

    function getSideOffsets(overflow, rect, preventedOffsets) {
      if (preventedOffsets === void 0) {
        preventedOffsets = {
          x: 0,
          y: 0
        };
      }

      return {
        top: overflow.top - rect.height - preventedOffsets.y,
        right: overflow.right - rect.width + preventedOffsets.x,
        bottom: overflow.bottom - rect.height + preventedOffsets.y,
        left: overflow.left - rect.width - preventedOffsets.x
      };
    }

    function isAnySideFullyClipped(overflow) {
      return [top, right, bottom, left].some(function (side) {
        return overflow[side] >= 0;
      });
    }

    function hide(_ref) {
      var state = _ref.state,
          name = _ref.name;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var preventedOffsets = state.modifiersData.preventOverflow;
      var referenceOverflow = detectOverflow(state, {
        elementContext: 'reference'
      });
      var popperAltOverflow = detectOverflow(state, {
        altBoundary: true
      });
      var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
      var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
      var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
      var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
      state.modifiersData[name] = {
        referenceClippingOffsets: referenceClippingOffsets,
        popperEscapeOffsets: popperEscapeOffsets,
        isReferenceHidden: isReferenceHidden,
        hasPopperEscaped: hasPopperEscaped
      };
      state.attributes.popper = Object.assign({}, state.attributes.popper, {
        'data-popper-reference-hidden': isReferenceHidden,
        'data-popper-escaped': hasPopperEscaped
      });
    } // eslint-disable-next-line import/no-unused-modules


    var hide$1 = {
      name: 'hide',
      enabled: true,
      phase: 'main',
      requiresIfExists: ['preventOverflow'],
      fn: hide
    };

    function distanceAndSkiddingToXY(placement, rects, offset) {
      var basePlacement = getBasePlacement$1(placement);
      var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

      var _ref = typeof offset === 'function' ? offset(Object.assign({}, rects, {
        placement: placement
      })) : offset,
          skidding = _ref[0],
          distance = _ref[1];

      skidding = skidding || 0;
      distance = (distance || 0) * invertDistance;
      return [left, right].indexOf(basePlacement) >= 0 ? {
        x: distance,
        y: skidding
      } : {
        x: skidding,
        y: distance
      };
    }

    function offset(_ref2) {
      var state = _ref2.state,
          options = _ref2.options,
          name = _ref2.name;
      var _options$offset = options.offset,
          offset = _options$offset === void 0 ? [0, 0] : _options$offset;
      var data = placements.reduce(function (acc, placement) {
        acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
        return acc;
      }, {});
      var _data$state$placement = data[state.placement],
          x = _data$state$placement.x,
          y = _data$state$placement.y;

      if (state.modifiersData.popperOffsets != null) {
        state.modifiersData.popperOffsets.x += x;
        state.modifiersData.popperOffsets.y += y;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var offset$1 = {
      name: 'offset',
      enabled: true,
      phase: 'main',
      requires: ['popperOffsets'],
      fn: offset
    };

    function popperOffsets(_ref) {
      var state = _ref.state,
          name = _ref.name;
      // Offsets are the actual position the popper needs to have to be
      // properly positioned near its reference element
      // This is the most basic placement, and will be adjusted by
      // the modifiers in the next step
      state.modifiersData[name] = computeOffsets({
        reference: state.rects.reference,
        element: state.rects.popper,
        strategy: 'absolute',
        placement: state.placement
      });
    } // eslint-disable-next-line import/no-unused-modules


    var popperOffsets$1 = {
      name: 'popperOffsets',
      enabled: true,
      phase: 'read',
      fn: popperOffsets,
      data: {}
    };

    function getAltAxis(axis) {
      return axis === 'x' ? 'y' : 'x';
    }

    function preventOverflow(_ref) {
      var state = _ref.state,
          options = _ref.options,
          name = _ref.name;
      var _options$mainAxis = options.mainAxis,
          checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
          _options$altAxis = options.altAxis,
          checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
          boundary = options.boundary,
          rootBoundary = options.rootBoundary,
          altBoundary = options.altBoundary,
          padding = options.padding,
          _options$tether = options.tether,
          tether = _options$tether === void 0 ? true : _options$tether,
          _options$tetherOffset = options.tetherOffset,
          tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
      var overflow = detectOverflow(state, {
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding,
        altBoundary: altBoundary
      });
      var basePlacement = getBasePlacement$1(state.placement);
      var variation = getVariation(state.placement);
      var isBasePlacement = !variation;
      var mainAxis = getMainAxisFromPlacement(basePlacement);
      var altAxis = getAltAxis(mainAxis);
      var popperOffsets = state.modifiersData.popperOffsets;
      var referenceRect = state.rects.reference;
      var popperRect = state.rects.popper;
      var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign({}, state.rects, {
        placement: state.placement
      })) : tetherOffset;
      var normalizedTetherOffsetValue = typeof tetherOffsetValue === 'number' ? {
        mainAxis: tetherOffsetValue,
        altAxis: tetherOffsetValue
      } : Object.assign({
        mainAxis: 0,
        altAxis: 0
      }, tetherOffsetValue);
      var offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
      var data = {
        x: 0,
        y: 0
      };

      if (!popperOffsets) {
        return;
      }

      if (checkMainAxis) {
        var _offsetModifierState$;

        var mainSide = mainAxis === 'y' ? top : left;
        var altSide = mainAxis === 'y' ? bottom : right;
        var len = mainAxis === 'y' ? 'height' : 'width';
        var offset = popperOffsets[mainAxis];
        var min$1 = offset + overflow[mainSide];
        var max$1 = offset - overflow[altSide];
        var additive = tether ? -popperRect[len] / 2 : 0;
        var minLen = variation === start ? referenceRect[len] : popperRect[len];
        var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
        // outside the reference bounds

        var arrowElement = state.elements.arrow;
        var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
          width: 0,
          height: 0
        };
        var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
        var arrowPaddingMin = arrowPaddingObject[mainSide];
        var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
        // to include its full size in the calculation. If the reference is small
        // and near the edge of a boundary, the popper can overflow even if the
        // reference is not overflowing as well (e.g. virtual elements with no
        // width or height)

        var arrowLen = within(0, referenceRect[len], arrowRect[len]);
        var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
        var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;
        var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
        var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
        var offsetModifierValue = (_offsetModifierState$ = offsetModifierState == null ? void 0 : offsetModifierState[mainAxis]) != null ? _offsetModifierState$ : 0;
        var tetherMin = offset + minOffset - offsetModifierValue - clientOffset;
        var tetherMax = offset + maxOffset - offsetModifierValue;
        var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
        popperOffsets[mainAxis] = preventedOffset;
        data[mainAxis] = preventedOffset - offset;
      }

      if (checkAltAxis) {
        var _offsetModifierState$2;

        var _mainSide = mainAxis === 'x' ? top : left;

        var _altSide = mainAxis === 'x' ? bottom : right;

        var _offset = popperOffsets[altAxis];

        var _len = altAxis === 'y' ? 'height' : 'width';

        var _min = _offset + overflow[_mainSide];

        var _max = _offset - overflow[_altSide];

        var isOriginSide = [top, left].indexOf(basePlacement) !== -1;

        var _offsetModifierValue = (_offsetModifierState$2 = offsetModifierState == null ? void 0 : offsetModifierState[altAxis]) != null ? _offsetModifierState$2 : 0;

        var _tetherMin = isOriginSide ? _min : _offset - referenceRect[_len] - popperRect[_len] - _offsetModifierValue + normalizedTetherOffsetValue.altAxis;

        var _tetherMax = isOriginSide ? _offset + referenceRect[_len] + popperRect[_len] - _offsetModifierValue - normalizedTetherOffsetValue.altAxis : _max;

        var _preventedOffset = tether && isOriginSide ? withinMaxClamp(_tetherMin, _offset, _tetherMax) : within(tether ? _tetherMin : _min, _offset, tether ? _tetherMax : _max);

        popperOffsets[altAxis] = _preventedOffset;
        data[altAxis] = _preventedOffset - _offset;
      }

      state.modifiersData[name] = data;
    } // eslint-disable-next-line import/no-unused-modules


    var preventOverflow$1 = {
      name: 'preventOverflow',
      enabled: true,
      phase: 'main',
      fn: preventOverflow,
      requiresIfExists: ['offset']
    };

    function getHTMLElementScroll(element) {
      return {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop
      };
    }

    function getNodeScroll(node) {
      if (node === getWindow(node) || !isHTMLElement(node)) {
        return getWindowScroll(node);
      } else {
        return getHTMLElementScroll(node);
      }
    }

    function isElementScaled(element) {
      var rect = element.getBoundingClientRect();
      var scaleX = round(rect.width) / element.offsetWidth || 1;
      var scaleY = round(rect.height) / element.offsetHeight || 1;
      return scaleX !== 1 || scaleY !== 1;
    } // Returns the composite rect of an element relative to its offsetParent.
    // Composite means it takes into account transforms as well as layout.


    function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
      if (isFixed === void 0) {
        isFixed = false;
      }

      var isOffsetParentAnElement = isHTMLElement(offsetParent);
      var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
      var documentElement = getDocumentElement(offsetParent);
      var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled);
      var scroll = {
        scrollLeft: 0,
        scrollTop: 0
      };
      var offsets = {
        x: 0,
        y: 0
      };

      if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
        if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
        isScrollParent(documentElement)) {
          scroll = getNodeScroll(offsetParent);
        }

        if (isHTMLElement(offsetParent)) {
          offsets = getBoundingClientRect(offsetParent, true);
          offsets.x += offsetParent.clientLeft;
          offsets.y += offsetParent.clientTop;
        } else if (documentElement) {
          offsets.x = getWindowScrollBarX(documentElement);
        }
      }

      return {
        x: rect.left + scroll.scrollLeft - offsets.x,
        y: rect.top + scroll.scrollTop - offsets.y,
        width: rect.width,
        height: rect.height
      };
    }

    function order(modifiers) {
      var map = new Map();
      var visited = new Set();
      var result = [];
      modifiers.forEach(function (modifier) {
        map.set(modifier.name, modifier);
      }); // On visiting object, check for its dependencies and visit them recursively

      function sort(modifier) {
        visited.add(modifier.name);
        var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
        requires.forEach(function (dep) {
          if (!visited.has(dep)) {
            var depModifier = map.get(dep);

            if (depModifier) {
              sort(depModifier);
            }
          }
        });
        result.push(modifier);
      }

      modifiers.forEach(function (modifier) {
        if (!visited.has(modifier.name)) {
          // check for visited object
          sort(modifier);
        }
      });
      return result;
    }

    function orderModifiers(modifiers) {
      // order based on dependencies
      var orderedModifiers = order(modifiers); // order based on phase

      return modifierPhases.reduce(function (acc, phase) {
        return acc.concat(orderedModifiers.filter(function (modifier) {
          return modifier.phase === phase;
        }));
      }, []);
    }

    function debounce$1(fn) {
      var pending;
      return function () {
        if (!pending) {
          pending = new Promise(function (resolve) {
            Promise.resolve().then(function () {
              pending = undefined;
              resolve(fn());
            });
          });
        }

        return pending;
      };
    }

    function mergeByName(modifiers) {
      var merged = modifiers.reduce(function (merged, current) {
        var existing = merged[current.name];
        merged[current.name] = existing ? Object.assign({}, existing, current, {
          options: Object.assign({}, existing.options, current.options),
          data: Object.assign({}, existing.data, current.data)
        }) : current;
        return merged;
      }, {}); // IE11 does not support Object.values

      return Object.keys(merged).map(function (key) {
        return merged[key];
      });
    }

    var DEFAULT_OPTIONS = {
      placement: 'bottom',
      modifiers: [],
      strategy: 'absolute'
    };

    function areValidElements() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return !args.some(function (element) {
        return !(element && typeof element.getBoundingClientRect === 'function');
      });
    }

    function popperGenerator(generatorOptions) {
      if (generatorOptions === void 0) {
        generatorOptions = {};
      }

      var _generatorOptions = generatorOptions,
          _generatorOptions$def = _generatorOptions.defaultModifiers,
          defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
          _generatorOptions$def2 = _generatorOptions.defaultOptions,
          defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
      return function createPopper(reference, popper, options) {
        if (options === void 0) {
          options = defaultOptions;
        }

        var state = {
          placement: 'bottom',
          orderedModifiers: [],
          options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
          modifiersData: {},
          elements: {
            reference: reference,
            popper: popper
          },
          attributes: {},
          styles: {}
        };
        var effectCleanupFns = [];
        var isDestroyed = false;
        var instance = {
          state: state,
          setOptions: function setOptions(setOptionsAction) {
            var options = typeof setOptionsAction === 'function' ? setOptionsAction(state.options) : setOptionsAction;
            cleanupModifierEffects();
            state.options = Object.assign({}, defaultOptions, state.options, options);
            state.scrollParents = {
              reference: isElement$1(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
              popper: listScrollParents(popper)
            }; // Orders the modifiers based on their dependencies and `phase`
            // properties

            var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

            state.orderedModifiers = orderedModifiers.filter(function (m) {
              return m.enabled;
            }); // Validate the provided modifiers so that the consumer will get warned

            runModifierEffects();
            return instance.update();
          },
          // Sync update – it will always be executed, even if not necessary. This
          // is useful for low frequency updates where sync behavior simplifies the
          // logic.
          // For high frequency updates (e.g. `resize` and `scroll` events), always
          // prefer the async Popper#update method
          forceUpdate: function forceUpdate() {
            if (isDestroyed) {
              return;
            }

            var _state$elements = state.elements,
                reference = _state$elements.reference,
                popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
            // anymore

            if (!areValidElements(reference, popper)) {

              return;
            } // Store the reference and popper rects to be read by modifiers


            state.rects = {
              reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
              popper: getLayoutRect(popper)
            }; // Modifiers have the ability to reset the current update cycle. The
            // most common use case for this is the `flip` modifier changing the
            // placement, which then needs to re-run all the modifiers, because the
            // logic was previously ran for the previous placement and is therefore
            // stale/incorrect

            state.reset = false;
            state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
            // is filled with the initial data specified by the modifier. This means
            // it doesn't persist and is fresh on each update.
            // To ensure persistent data, use `${name}#persistent`

            state.orderedModifiers.forEach(function (modifier) {
              return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
            });

            for (var index = 0; index < state.orderedModifiers.length; index++) {

              if (state.reset === true) {
                state.reset = false;
                index = -1;
                continue;
              }

              var _state$orderedModifie = state.orderedModifiers[index],
                  fn = _state$orderedModifie.fn,
                  _state$orderedModifie2 = _state$orderedModifie.options,
                  _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
                  name = _state$orderedModifie.name;

              if (typeof fn === 'function') {
                state = fn({
                  state: state,
                  options: _options,
                  name: name,
                  instance: instance
                }) || state;
              }
            }
          },
          // Async and optimistically optimized update – it will not be executed if
          // not necessary (debounced to run at most once-per-tick)
          update: debounce$1(function () {
            return new Promise(function (resolve) {
              instance.forceUpdate();
              resolve(state);
            });
          }),
          destroy: function destroy() {
            cleanupModifierEffects();
            isDestroyed = true;
          }
        };

        if (!areValidElements(reference, popper)) {

          return instance;
        }

        instance.setOptions(options).then(function (state) {
          if (!isDestroyed && options.onFirstUpdate) {
            options.onFirstUpdate(state);
          }
        }); // Modifiers have the ability to execute arbitrary code before the first
        // update cycle runs. They will be executed in the same order as the update
        // cycle. This is useful when a modifier adds some persistent data that
        // other modifiers need to use, but the modifier is run after the dependent
        // one.

        function runModifierEffects() {
          state.orderedModifiers.forEach(function (_ref3) {
            var name = _ref3.name,
                _ref3$options = _ref3.options,
                options = _ref3$options === void 0 ? {} : _ref3$options,
                effect = _ref3.effect;

            if (typeof effect === 'function') {
              var cleanupFn = effect({
                state: state,
                name: name,
                instance: instance,
                options: options
              });

              var noopFn = function noopFn() {};

              effectCleanupFns.push(cleanupFn || noopFn);
            }
          });
        }

        function cleanupModifierEffects() {
          effectCleanupFns.forEach(function (fn) {
            return fn();
          });
          effectCleanupFns = [];
        }

        return instance;
      };
    }

    var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
    var createPopper = /*#__PURE__*/popperGenerator({
      defaultModifiers: defaultModifiers
    }); // eslint-disable-next-line import/no-unused-modules

    /**!
    * tippy.js v6.0.3
    * (c) 2017-2020 atomiks
    * MIT License
    */

    var PASSIVE = {
      passive: true
    };
    var IOS_CLASS = "tippy-iOS";
    var BOX_CLASS = "tippy-box";
    var CONTENT_CLASS = "tippy-content";
    var BACKDROP_CLASS = "tippy-backdrop";
    var ARROW_CLASS = "tippy-arrow";
    var SVG_ARROW_CLASS = "tippy-svg-arrow";
    function getValueAtIndexOrReturn(value, index, defaultValue) {
      if (Array.isArray(value)) {
        var v = value[index];
        return v == null ? Array.isArray(defaultValue) ? defaultValue[index] : defaultValue : v;
      }

      return value;
    }
    function isType(value, type) {
      var str = {}.toString.call(value);
      return str.indexOf('[object') === 0 && str.indexOf(type + "]") > -1;
    }
    function invokeWithArgsOrReturn(value, args) {
      return typeof value === 'function' ? value.apply(void 0, args) : value;
    }
    function debounce(fn, ms) {
      // Avoid wrapping in `setTimeout` if ms is 0 anyway
      if (ms === 0) {
        return fn;
      }

      var timeout;
      return function (arg) {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          fn(arg);
        }, ms);
      };
    }
    function splitBySpaces(value) {
      return value.split(/\s+/).filter(Boolean);
    }
    function normalizeToArray(value) {
      return [].concat(value);
    }
    function pushIfUnique(arr, value) {
      if (arr.indexOf(value) === -1) {
        arr.push(value);
      }
    }
    function unique(arr) {
      return arr.filter(function (item, index) {
        return arr.indexOf(item) === index;
      });
    }
    function getBasePlacement(placement) {
      return placement.split('-')[0];
    }
    function arrayFrom(value) {
      return [].slice.call(value);
    }

    function div() {
      return document.createElement('div');
    }
    function isElement(value) {
      return isType(value, 'Element');
    }
    function isNodeList(value) {
      return isType(value, 'NodeList');
    }
    function isMouseEvent(value) {
      return isType(value, 'MouseEvent');
    }
    function isReferenceElement(value) {
      return !!(value && value._tippy && value._tippy.reference === value);
    }
    function getArrayOfElements(value) {
      if (isElement(value)) {
        return [value];
      }

      if (isNodeList(value)) {
        return arrayFrom(value);
      }

      if (Array.isArray(value)) {
        return value;
      }

      return arrayFrom(document.querySelectorAll(value));
    }
    function setTransitionDuration(els, value) {
      els.forEach(function (el) {
        if (el) {
          el.style.transitionDuration = value + "ms";
        }
      });
    }
    function setVisibilityState(els, state) {
      els.forEach(function (el) {
        if (el) {
          el.setAttribute('data-state', state);
        }
      });
    }
    function getOwnerDocument(elementOrElements) {
      var _normalizeToArray = normalizeToArray(elementOrElements),
          element = _normalizeToArray[0];

      return element ? element.ownerDocument || document : document;
    }
    function isCursorOutsideInteractiveBorder(popperTreeData, event) {
      var clientX = event.clientX,
          clientY = event.clientY;
      return popperTreeData.every(function (_ref) {
        var popperRect = _ref.popperRect,
            popperState = _ref.popperState,
            props = _ref.props;
        var interactiveBorder = props.interactiveBorder;
        var basePlacement = getBasePlacement(popperState.placement);
        var offsetData = popperState.modifiersData.offset;

        if (!offsetData) {
          return true;
        }

        var topDistance = basePlacement === 'bottom' ? offsetData.top.y : 0;
        var bottomDistance = basePlacement === 'top' ? offsetData.bottom.y : 0;
        var leftDistance = basePlacement === 'right' ? offsetData.left.x : 0;
        var rightDistance = basePlacement === 'left' ? offsetData.right.x : 0;
        var exceedsTop = popperRect.top - clientY + topDistance > interactiveBorder;
        var exceedsBottom = clientY - popperRect.bottom - bottomDistance > interactiveBorder;
        var exceedsLeft = popperRect.left - clientX + leftDistance > interactiveBorder;
        var exceedsRight = clientX - popperRect.right - rightDistance > interactiveBorder;
        return exceedsTop || exceedsBottom || exceedsLeft || exceedsRight;
      });
    }
    function updateTransitionEndListener(box, action, listener) {
      var method = action + "EventListener"; // some browsers apparently support `transition` (unprefixed) but only fire
      // `webkitTransitionEnd`...

      ['transitionend', 'webkitTransitionEnd'].forEach(function (event) {
        box[method](event, listener);
      });
    }

    var currentInput = {
      isTouch: false
    };
    var lastMouseMoveTime = 0;
    /**
     * When a `touchstart` event is fired, it's assumed the user is using touch
     * input. We'll bind a `mousemove` event listener to listen for mouse input in
     * the future. This way, the `isTouch` property is fully dynamic and will handle
     * hybrid devices that use a mix of touch + mouse input.
     */

    function onDocumentTouchStart() {
      if (currentInput.isTouch) {
        return;
      }

      currentInput.isTouch = true;

      if (window.performance) {
        document.addEventListener('mousemove', onDocumentMouseMove);
      }
    }
    /**
     * When two `mousemove` event are fired consecutively within 20ms, it's assumed
     * the user is using mouse input again. `mousemove` can fire on touch devices as
     * well, but very rarely that quickly.
     */

    function onDocumentMouseMove() {
      var now = performance.now();

      if (now - lastMouseMoveTime < 20) {
        currentInput.isTouch = false;
        document.removeEventListener('mousemove', onDocumentMouseMove);
      }

      lastMouseMoveTime = now;
    }
    /**
     * When an element is in focus and has a tippy, leaving the tab/window and
     * returning causes it to show again. For mouse users this is unexpected, but
     * for keyboard use it makes sense.
     * TODO: find a better technique to solve this problem
     */

    function onWindowBlur() {
      var activeElement = document.activeElement;

      if (isReferenceElement(activeElement)) {
        var instance = activeElement._tippy;

        if (activeElement.blur && !instance.state.isVisible) {
          activeElement.blur();
        }
      }
    }
    function bindGlobalEventListeners() {
      document.addEventListener('touchstart', onDocumentTouchStart, Object.assign({}, PASSIVE, {
        capture: true
      }));
      window.addEventListener('blur', onWindowBlur);
    }

    var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    var ua = isBrowser ? navigator.userAgent : '';
    var isIE = /MSIE |Trident\//.test(ua);
    var isIOS = isBrowser && /iPhone|iPad|iPod/.test(navigator.platform);

    var pluginProps = {
      animateFill: false,
      followCursor: false,
      inlinePositioning: false,
      sticky: false
    };
    var renderProps = {
      allowHTML: false,
      animation: 'fade',
      arrow: true,
      content: '',
      inertia: false,
      maxWidth: 350,
      role: 'tooltip',
      theme: '',
      zIndex: 9999
    };
    var defaultProps = Object.assign({
      appendTo: function appendTo() {
        return document.body;
      },
      aria: {
        content: 'auto',
        expanded: 'auto'
      },
      content: '',
      delay: 0,
      duration: [300, 250],
      getReferenceClientRect: null,
      hideOnClick: true,
      ignoreAttributes: false,
      interactive: false,
      interactiveBorder: 2,
      interactiveDebounce: 0,
      moveTransition: '',
      offset: [0, 10],
      onAfterUpdate: function onAfterUpdate() {},
      onBeforeUpdate: function onBeforeUpdate() {},
      onCreate: function onCreate() {},
      onDestroy: function onDestroy() {},
      onHidden: function onHidden() {},
      onHide: function onHide() {},
      onMount: function onMount() {},
      onShow: function onShow() {},
      onShown: function onShown() {},
      onTrigger: function onTrigger() {},
      onUntrigger: function onUntrigger() {},
      placement: 'top',
      plugins: [],
      popperOptions: {},
      render: null,
      showOnCreate: false,
      touch: true,
      trigger: 'mouseenter focus',
      triggerTarget: null
    }, pluginProps, {}, renderProps);
    var defaultKeys = Object.keys(defaultProps);
    var setDefaultProps = function setDefaultProps(partialProps) {

      var keys = Object.keys(partialProps);
      keys.forEach(function (key) {
        defaultProps[key] = partialProps[key];
      });
    };
    function getExtendedPassedProps(passedProps) {
      var plugins = passedProps.plugins || [];
      var pluginProps = plugins.reduce(function (acc, plugin) {
        var name = plugin.name,
            defaultValue = plugin.defaultValue;

        if (name) {
          acc[name] = passedProps[name] !== undefined ? passedProps[name] : defaultValue;
        }

        return acc;
      }, {});
      return Object.assign({}, passedProps, {}, pluginProps);
    }
    function getDataAttributeProps(reference, plugins) {
      var propKeys = plugins ? Object.keys(getExtendedPassedProps(Object.assign({}, defaultProps, {
        plugins: plugins
      }))) : defaultKeys;
      var props = propKeys.reduce(function (acc, key) {
        var valueAsString = (reference.getAttribute("data-tippy-" + key) || '').trim();

        if (!valueAsString) {
          return acc;
        }

        if (key === 'content') {
          acc[key] = valueAsString;
        } else {
          try {
            acc[key] = JSON.parse(valueAsString);
          } catch (e) {
            acc[key] = valueAsString;
          }
        }

        return acc;
      }, {});
      return props;
    }
    function evaluateProps(reference, props) {
      var out = Object.assign({}, props, {
        content: invokeWithArgsOrReturn(props.content, [reference])
      }, props.ignoreAttributes ? {} : getDataAttributeProps(reference, props.plugins));
      out.aria = Object.assign({}, defaultProps.aria, {}, out.aria);
      out.aria = {
        expanded: out.aria.expanded === 'auto' ? props.interactive : out.aria.expanded,
        content: out.aria.content === 'auto' ? props.interactive ? null : 'describedby' : out.aria.content
      };
      return out;
    }

    var innerHTML = function innerHTML() {
      return 'innerHTML';
    };

    function dangerouslySetInnerHTML(element, html) {
      element[innerHTML()] = html;
    }

    function createArrowElement(value) {
      var arrow = div();

      if (value === true) {
        arrow.className = ARROW_CLASS;
      } else {
        arrow.className = SVG_ARROW_CLASS;

        if (isElement(value)) {
          arrow.appendChild(value);
        } else {
          dangerouslySetInnerHTML(arrow, value);
        }
      }

      return arrow;
    }

    function setContent(content, props) {
      if (isElement(props.content)) {
        dangerouslySetInnerHTML(content, '');
        content.appendChild(props.content);
      } else if (typeof props.content !== 'function') {
        if (props.allowHTML) {
          dangerouslySetInnerHTML(content, props.content);
        } else {
          content.textContent = props.content;
        }
      }
    }
    function getChildren(popper) {
      var box = popper.firstElementChild;
      var boxChildren = arrayFrom(box.children);
      return {
        box: box,
        content: boxChildren.find(function (node) {
          return node.classList.contains(CONTENT_CLASS);
        }),
        arrow: boxChildren.find(function (node) {
          return node.classList.contains(ARROW_CLASS) || node.classList.contains(SVG_ARROW_CLASS);
        }),
        backdrop: boxChildren.find(function (node) {
          return node.classList.contains(BACKDROP_CLASS);
        })
      };
    }
    function render(instance) {
      var popper = div();
      var box = div();
      box.className = BOX_CLASS;
      box.setAttribute('data-state', 'hidden');
      box.setAttribute('tabindex', '-1');
      var content = div();
      content.className = CONTENT_CLASS;
      content.setAttribute('data-state', 'hidden');
      setContent(content, instance.props);
      popper.appendChild(box);
      box.appendChild(content);
      onUpdate(instance.props, instance.props);

      function onUpdate(prevProps, nextProps) {
        var _getChildren = getChildren(popper),
            box = _getChildren.box,
            content = _getChildren.content,
            arrow = _getChildren.arrow;

        if (nextProps.theme) {
          box.setAttribute('data-theme', nextProps.theme);
        } else {
          box.removeAttribute('data-theme');
        }

        if (typeof nextProps.animation === 'string') {
          box.setAttribute('data-animation', nextProps.animation);
        } else {
          box.removeAttribute('data-animation');
        }

        if (nextProps.inertia) {
          box.setAttribute('data-inertia', '');
        } else {
          box.removeAttribute('data-inertia');
        }

        box.style.maxWidth = typeof nextProps.maxWidth === 'number' ? nextProps.maxWidth + "px" : nextProps.maxWidth;

        if (nextProps.role) {
          box.setAttribute('role', nextProps.role);
        } else {
          box.removeAttribute('role');
        }

        if (prevProps.content !== nextProps.content) {
          setContent(content, instance.props);
        }

        if (nextProps.arrow) {
          if (!arrow) {
            box.appendChild(createArrowElement(nextProps.arrow));
          } else if (prevProps.arrow !== nextProps.arrow) {
            box.removeChild(arrow);
            box.appendChild(createArrowElement(nextProps.arrow));
          }
        } else if (arrow) {
          box.removeChild(arrow);
        }
      }

      return {
        popper: popper,
        onUpdate: onUpdate
      };
    } // Runtime check to identify if the render function is the default one; this
    // way we can apply default CSS transitions logic and it can be tree-shaken away

    render.$$tippy = true;

    var idCounter = 1;
    var mouseMoveListeners = []; // Used by `hideAll()`

    var mountedInstances = [];
    function createTippy(reference, passedProps) {
      var props = evaluateProps(reference, Object.assign({}, defaultProps, {}, getExtendedPassedProps(passedProps))); // ===========================================================================
      // 🔒 Private members
      // ===========================================================================

      var showTimeout;
      var hideTimeout;
      var scheduleHideAnimationFrame;
      var isVisibleFromClick = false;
      var didHideDueToDocumentMouseDown = false;
      var ignoreOnFirstUpdate = false;
      var lastTriggerEvent;
      var currentTransitionEndListener;
      var onFirstUpdate;
      var listeners = [];
      var debouncedOnMouseMove = debounce(onMouseMove, props.interactiveDebounce);
      var currentTarget;
      var doc = getOwnerDocument(props.triggerTarget || reference); // ===========================================================================
      // 🔑 Public members
      // ===========================================================================

      var id = idCounter++;
      var popperInstance = null;
      var plugins = unique(props.plugins);
      var state = {
        // Is the instance currently enabled?
        isEnabled: true,
        // Is the tippy currently showing and not transitioning out?
        isVisible: false,
        // Has the instance been destroyed?
        isDestroyed: false,
        // Is the tippy currently mounted to the DOM?
        isMounted: false,
        // Has the tippy finished transitioning in?
        isShown: false
      };
      var instance = {
        // properties
        id: id,
        reference: reference,
        popper: div(),
        popperInstance: popperInstance,
        props: props,
        state: state,
        plugins: plugins,
        // methods
        clearDelayTimeouts: clearDelayTimeouts,
        setProps: setProps,
        setContent: setContent,
        show: show,
        hide: hide,
        enable: enable,
        disable: disable,
        unmount: unmount,
        destroy: destroy
      }; // TODO: Investigate why this early return causes a TDZ error in the tests —
      // it doesn't seem to happen in the browser

      /* istanbul ignore if */

      if (!props.render) {

        return instance;
      } // ===========================================================================
      // Initial mutations
      // ===========================================================================


      var _props$render = props.render(instance),
          popper = _props$render.popper,
          onUpdate = _props$render.onUpdate;

      popper.setAttribute('data-tippy-root', '');
      popper.id = "tippy-" + instance.id;
      instance.popper = popper;
      reference._tippy = instance;
      popper._tippy = instance;
      var pluginsHooks = plugins.map(function (plugin) {
        return plugin.fn(instance);
      });
      var hasAriaExpanded = reference.hasAttribute('aria-expanded');
      addListeners();
      handleAriaExpandedAttribute();
      handleStyles();
      invokeHook('onCreate', [instance]);

      if (props.showOnCreate) {
        scheduleShow();
      } // Prevent a tippy with a delay from hiding if the cursor left then returned
      // before it started hiding


      popper.addEventListener('mouseenter', function () {
        if (instance.props.interactive && instance.state.isVisible) {
          instance.clearDelayTimeouts();
        }
      });
      popper.addEventListener('mouseleave', function (event) {
        if (instance.props.interactive && instance.props.trigger.indexOf('mouseenter') >= 0) {
          doc.addEventListener('mousemove', debouncedOnMouseMove);
          debouncedOnMouseMove(event);
        }
      });
      return instance; // ===========================================================================
      // 🔒 Private methods
      // ===========================================================================

      function getNormalizedTouchSettings() {
        var touch = instance.props.touch;
        return Array.isArray(touch) ? touch : [touch, 0];
      }

      function getIsCustomTouchBehavior() {
        return getNormalizedTouchSettings()[0] === 'hold';
      }

      function getIsDefaultRenderFn() {
        var _instance$props$rende;

        // @ts-ignore
        return !!((_instance$props$rende = instance.props.render) == null ? void 0 : _instance$props$rende.$$tippy);
      }

      function getCurrentTarget() {
        return currentTarget || reference;
      }

      function getDefaultTemplateChildren() {
        return getChildren(popper);
      }

      function getDelay(isShow) {
        // For touch or keyboard input, force `0` delay for UX reasons
        // Also if the instance is mounted but not visible (transitioning out),
        // ignore delay
        if (instance.state.isMounted && !instance.state.isVisible || currentInput.isTouch || lastTriggerEvent && lastTriggerEvent.type === 'focus') {
          return 0;
        }

        return getValueAtIndexOrReturn(instance.props.delay, isShow ? 0 : 1, defaultProps.delay);
      }

      function handleStyles() {
        popper.style.pointerEvents = instance.props.interactive && instance.state.isVisible ? '' : 'none';
        popper.style.zIndex = "" + instance.props.zIndex;
      }

      function updateIOSClass(isAdd) {
        var shouldAdd = isAdd && isIOS && currentInput.isTouch;
        doc.body.classList[shouldAdd ? 'add' : 'remove'](IOS_CLASS);
      }

      function invokeHook(hook, args, shouldInvokePropsHook) {
        if (shouldInvokePropsHook === void 0) {
          shouldInvokePropsHook = true;
        }

        pluginsHooks.forEach(function (pluginHooks) {
          if (pluginHooks[hook]) {
            pluginHooks[hook].apply(void 0, args);
          }
        });

        if (shouldInvokePropsHook) {
          var _instance$props;

          (_instance$props = instance.props)[hook].apply(_instance$props, args);
        }
      }

      function handleAriaContentAttribute() {
        var aria = instance.props.aria;

        if (!aria.content) {
          return;
        }

        var attr = "aria-" + aria.content;
        var id = popper.id;
        var nodes = normalizeToArray(instance.props.triggerTarget || reference);
        nodes.forEach(function (node) {
          var currentValue = node.getAttribute(attr);

          if (instance.state.isVisible) {
            node.setAttribute(attr, currentValue ? currentValue + " " + id : id);
          } else {
            var nextValue = currentValue && currentValue.replace(id, '').trim();

            if (nextValue) {
              node.setAttribute(attr, nextValue);
            } else {
              node.removeAttribute(attr);
            }
          }
        });
      }

      function handleAriaExpandedAttribute() {
        if (hasAriaExpanded || !instance.props.aria.expanded) {
          return;
        }

        var nodes = normalizeToArray(instance.props.triggerTarget || reference);
        nodes.forEach(function (node) {
          if (instance.props.interactive) {
            node.setAttribute('aria-expanded', instance.state.isVisible && node === getCurrentTarget() ? 'true' : 'false');
          } else {
            node.removeAttribute('aria-expanded');
          }
        });
      }

      function cleanupInteractiveMouseListeners() {
        doc.body.removeEventListener('mouseleave', scheduleHide);
        doc.removeEventListener('mousemove', debouncedOnMouseMove);
        mouseMoveListeners = mouseMoveListeners.filter(function (listener) {
          return listener !== debouncedOnMouseMove;
        });
      }

      function onDocumentMouseDown(event) {
        // Clicked on interactive popper
        if (instance.props.interactive && popper.contains(event.target)) {
          return;
        } // Clicked on the event listeners target


        if (getCurrentTarget().contains(event.target)) {
          if (currentInput.isTouch) {
            return;
          }

          if (instance.state.isVisible && instance.props.trigger.indexOf('click') >= 0) {
            return;
          }
        }

        if (instance.props.hideOnClick === true) {
          isVisibleFromClick = false;
          instance.clearDelayTimeouts();
          instance.hide(); // `mousedown` event is fired right before `focus` if pressing the
          // currentTarget. This lets a tippy with `focus` trigger know that it
          // should not show

          didHideDueToDocumentMouseDown = true;
          setTimeout(function () {
            didHideDueToDocumentMouseDown = false;
          }); // The listener gets added in `scheduleShow()`, but this may be hiding it
          // before it shows, and hide()'s early bail-out behavior can prevent it
          // from being cleaned up

          if (!instance.state.isMounted) {
            removeDocumentMouseDownListener();
          }
        }
      }

      function addDocumentMouseDownListener() {
        doc.addEventListener('mousedown', onDocumentMouseDown, true);
      }

      function removeDocumentMouseDownListener() {
        doc.removeEventListener('mousedown', onDocumentMouseDown, true);
      }

      function onTransitionedOut(duration, callback) {
        onTransitionEnd(duration, function () {
          if (!instance.state.isVisible && popper.parentNode && popper.parentNode.contains(popper)) {
            callback();
          }
        });
      }

      function onTransitionedIn(duration, callback) {
        onTransitionEnd(duration, callback);
      }

      function onTransitionEnd(duration, callback) {
        var box = getDefaultTemplateChildren().box;

        function listener(event) {
          if (event.target === box) {
            updateTransitionEndListener(box, 'remove', listener);
            callback();
          }
        } // Make callback synchronous if duration is 0
        // `transitionend` won't fire otherwise


        if (duration === 0) {
          return callback();
        }

        updateTransitionEndListener(box, 'remove', currentTransitionEndListener);
        updateTransitionEndListener(box, 'add', listener);
        currentTransitionEndListener = listener;
      }

      function on(eventType, handler, options) {
        if (options === void 0) {
          options = false;
        }

        var nodes = normalizeToArray(instance.props.triggerTarget || reference);
        nodes.forEach(function (node) {
          node.addEventListener(eventType, handler, options);
          listeners.push({
            node: node,
            eventType: eventType,
            handler: handler,
            options: options
          });
        });
      }

      function addListeners() {
        if (getIsCustomTouchBehavior()) {
          on('touchstart', onTrigger, PASSIVE);
          on('touchend', onMouseLeave, PASSIVE);
        }

        splitBySpaces(instance.props.trigger).forEach(function (eventType) {
          if (eventType === 'manual') {
            return;
          }

          on(eventType, onTrigger);

          switch (eventType) {
            case 'mouseenter':
              on('mouseleave', onMouseLeave);
              break;

            case 'focus':
              on(isIE ? 'focusout' : 'blur', onBlurOrFocusOut);
              break;

            case 'focusin':
              on('focusout', onBlurOrFocusOut);
              break;
          }
        });
      }

      function removeListeners() {
        listeners.forEach(function (_ref) {
          var node = _ref.node,
              eventType = _ref.eventType,
              handler = _ref.handler,
              options = _ref.options;
          node.removeEventListener(eventType, handler, options);
        });
        listeners = [];
      }

      function onTrigger(event) {
        var shouldScheduleClickHide = false;

        if (!instance.state.isEnabled || isEventListenerStopped(event) || didHideDueToDocumentMouseDown) {
          return;
        }

        lastTriggerEvent = event;
        currentTarget = event.currentTarget;
        handleAriaExpandedAttribute();

        if (!instance.state.isVisible && isMouseEvent(event)) {
          // If scrolling, `mouseenter` events can be fired if the cursor lands
          // over a new target, but `mousemove` events don't get fired. This
          // causes interactive tooltips to get stuck open until the cursor is
          // moved
          mouseMoveListeners.forEach(function (listener) {
            return listener(event);
          });
        } // Toggle show/hide when clicking click-triggered tooltips


        if (event.type === 'click' && (instance.props.trigger.indexOf('mouseenter') < 0 || isVisibleFromClick) && instance.props.hideOnClick !== false && instance.state.isVisible) {
          shouldScheduleClickHide = true;
        } else {
          var _getNormalizedTouchSe = getNormalizedTouchSettings(),
              value = _getNormalizedTouchSe[0],
              duration = _getNormalizedTouchSe[1];

          if (currentInput.isTouch && value === 'hold' && duration) {
            // We can hijack the show timeout here, it will be cleared by
            // `scheduleHide()` when necessary
            showTimeout = setTimeout(function () {
              scheduleShow(event);
            }, duration);
          } else {
            scheduleShow(event);
          }
        }

        if (event.type === 'click') {
          isVisibleFromClick = !shouldScheduleClickHide;
        }

        if (shouldScheduleClickHide) {
          scheduleHide(event);
        }
      }

      function onMouseMove(event) {
        var target = event.target;
        var isCursorOverReferenceOrPopper = reference.contains(target) || popper.contains(target);

        if (event.type === 'mousemove' && isCursorOverReferenceOrPopper) {
          return;
        }

        var popperTreeData = getNestedPopperTree().concat(popper).map(function (popper) {
          var _instance$popperInsta;

          var instance = popper._tippy;
          var state = (_instance$popperInsta = instance.popperInstance) == null ? void 0 : _instance$popperInsta.state;

          if (state) {
            return {
              popperRect: popper.getBoundingClientRect(),
              popperState: state,
              props: props
            };
          }

          return null;
        }).filter(Boolean);

        if (isCursorOutsideInteractiveBorder(popperTreeData, event)) {
          cleanupInteractiveMouseListeners();
          scheduleHide(event);
        }
      }

      function onMouseLeave(event) {
        var shouldBail = isEventListenerStopped(event) || instance.props.trigger.indexOf('click') >= 0 && isVisibleFromClick;

        if (shouldBail) {
          return;
        }

        if (instance.props.interactive) {
          doc.body.addEventListener('mouseleave', scheduleHide);
          doc.addEventListener('mousemove', debouncedOnMouseMove);
          pushIfUnique(mouseMoveListeners, debouncedOnMouseMove);
          debouncedOnMouseMove(event);
          return;
        }

        scheduleHide(event);
      }

      function onBlurOrFocusOut(event) {
        if (instance.props.trigger.indexOf('focusin') < 0 && event.target !== getCurrentTarget()) {
          return;
        } // If focus was moved to within the popper


        if (instance.props.interactive && event.relatedTarget && popper.contains(event.relatedTarget)) {
          return;
        }

        scheduleHide(event);
      }

      function isEventListenerStopped(event) {
        return currentInput.isTouch ? getIsCustomTouchBehavior() !== event.type.indexOf('touch') >= 0 : false;
      }

      function createPopperInstance() {
        destroyPopperInstance();
        var _instance$props2 = instance.props,
            popperOptions = _instance$props2.popperOptions,
            placement = _instance$props2.placement,
            offset = _instance$props2.offset,
            getReferenceClientRect = _instance$props2.getReferenceClientRect,
            moveTransition = _instance$props2.moveTransition;
        var arrow = getIsDefaultRenderFn() ? getChildren(popper).arrow : null;
        var computedReference = getReferenceClientRect ? {
          getBoundingClientRect: getReferenceClientRect
        } : reference;
        var tippyModifier = {
          name: '$$tippy',
          enabled: true,
          phase: 'beforeWrite',
          requires: ['computeStyles'],
          fn: function fn(_ref2) {
            var state = _ref2.state;

            if (getIsDefaultRenderFn()) {
              var _getDefaultTemplateCh = getDefaultTemplateChildren(),
                  box = _getDefaultTemplateCh.box;

              ['placement', 'reference-hidden', 'escaped'].forEach(function (attr) {
                if (attr === 'placement') {
                  box.setAttribute('data-placement', state.placement);
                } else {
                  if (state.attributes.popper["data-popper-" + attr]) {
                    box.setAttribute("data-" + attr, '');
                  } else {
                    box.removeAttribute("data-" + attr);
                  }
                }
              });
              state.attributes.popper = {};
            }
          }
        };
        var arrowModifier = {
          name: 'arrow',
          enabled: !!arrow,
          options: {
            element: arrow,
            padding: 3
          }
        };
        var modifiers = [{
          name: 'offset',
          options: {
            offset: offset
          }
        }, {
          name: 'preventOverflow',
          options: {
            padding: {
              top: 2,
              bottom: 2,
              left: 5,
              right: 5
            }
          }
        }, {
          name: 'flip',
          options: {
            padding: 5
          }
        }, {
          name: 'computeStyles',
          options: {
            adaptive: !moveTransition
          }
        }].concat(getIsDefaultRenderFn() ? [arrowModifier] : [], (popperOptions == null ? void 0 : popperOptions.modifiers) || [], [tippyModifier]);
        instance.popperInstance = createPopper(computedReference, popper, Object.assign({}, popperOptions, {
          placement: placement,
          onFirstUpdate: onFirstUpdate,
          modifiers: modifiers
        }));
      }

      function destroyPopperInstance() {
        if (instance.popperInstance) {
          instance.popperInstance.destroy();
          instance.popperInstance = null;
        }
      }

      function mount() {
        var appendTo = instance.props.appendTo;
        var parentNode; // By default, we'll append the popper to the triggerTargets's parentNode so
        // it's directly after the reference element so the elements inside the
        // tippy can be tabbed to
        // If there are clipping issues, the user can specify a different appendTo
        // and ensure focus management is handled correctly manually

        var node = getCurrentTarget();

        if (instance.props.interactive && appendTo === defaultProps.appendTo || appendTo === 'parent') {
          parentNode = node.parentNode;
        } else {
          parentNode = invokeWithArgsOrReturn(appendTo, [node]);
        } // The popper element needs to exist on the DOM before its position can be
        // updated as Popper needs to read its dimensions


        if (!parentNode.contains(popper)) {
          parentNode.appendChild(popper);
        }

        createPopperInstance();
      }

      function getNestedPopperTree() {
        return arrayFrom(popper.querySelectorAll('[data-tippy-root]'));
      }

      function scheduleShow(event) {
        instance.clearDelayTimeouts();

        if (event) {
          invokeHook('onTrigger', [instance, event]);
        }

        addDocumentMouseDownListener();
        var delay = getDelay(true);

        if (delay) {
          showTimeout = setTimeout(function () {
            instance.show();
          }, delay);
        } else {
          instance.show();
        }
      }

      function scheduleHide(event) {
        instance.clearDelayTimeouts();
        invokeHook('onUntrigger', [instance, event]);

        if (!instance.state.isVisible) {
          removeDocumentMouseDownListener();
          return;
        } // For interactive tippies, scheduleHide is added to a document.body handler
        // from onMouseLeave so must intercept scheduled hides from mousemove/leave
        // events when trigger contains mouseenter and click, and the tip is
        // currently shown as a result of a click.


        if (instance.props.trigger.indexOf('mouseenter') >= 0 && instance.props.trigger.indexOf('click') >= 0 && ['mouseleave', 'mousemove'].indexOf(event.type) >= 0 && isVisibleFromClick) {
          return;
        }

        var delay = getDelay(false);

        if (delay) {
          hideTimeout = setTimeout(function () {
            if (instance.state.isVisible) {
              instance.hide();
            }
          }, delay);
        } else {
          // Fixes a `transitionend` problem when it fires 1 frame too
          // late sometimes, we don't want hide() to be called.
          scheduleHideAnimationFrame = requestAnimationFrame(function () {
            instance.hide();
          });
        }
      } // ===========================================================================
      // 🔑 Public methods
      // ===========================================================================


      function enable() {
        instance.state.isEnabled = true;
      }

      function disable() {
        // Disabling the instance should also hide it
        // https://github.com/atomiks/tippy.js-react/issues/106
        instance.hide();
        instance.state.isEnabled = false;
      }

      function clearDelayTimeouts() {
        clearTimeout(showTimeout);
        clearTimeout(hideTimeout);
        cancelAnimationFrame(scheduleHideAnimationFrame);
      }

      function setProps(partialProps) {

        if (instance.state.isDestroyed) {
          return;
        }

        invokeHook('onBeforeUpdate', [instance, partialProps]);
        removeListeners();
        var prevProps = instance.props;
        var nextProps = evaluateProps(reference, Object.assign({}, instance.props, {}, partialProps, {
          ignoreAttributes: true
        }));
        instance.props = nextProps;
        addListeners();

        if (prevProps.interactiveDebounce !== nextProps.interactiveDebounce) {
          cleanupInteractiveMouseListeners();
          debouncedOnMouseMove = debounce(onMouseMove, nextProps.interactiveDebounce);
        } // Ensure stale aria-expanded attributes are removed


        if (prevProps.triggerTarget && !nextProps.triggerTarget) {
          normalizeToArray(prevProps.triggerTarget).forEach(function (node) {
            node.removeAttribute('aria-expanded');
          });
        } else if (nextProps.triggerTarget) {
          reference.removeAttribute('aria-expanded');
        }

        handleAriaExpandedAttribute();
        handleStyles();

        if (onUpdate) {
          onUpdate(prevProps, nextProps);
        }

        if (instance.popperInstance) {
          createPopperInstance(); // Fixes an issue with nested tippies if they are all getting re-rendered,
          // and the nested ones get re-rendered first.
          // https://github.com/atomiks/tippyjs-react/issues/177
          // TODO: find a cleaner / more efficient solution(!)

          getNestedPopperTree().forEach(function (nestedPopper) {
            // React (and other UI libs likely) requires a rAF wrapper as it flushes
            // its work in one
            requestAnimationFrame(nestedPopper._tippy.popperInstance.forceUpdate);
          });
        }

        invokeHook('onAfterUpdate', [instance, partialProps]);
      }

      function setContent(content) {
        instance.setProps({
          content: content
        });
      }

      function show() {


        var isAlreadyVisible = instance.state.isVisible;
        var isDestroyed = instance.state.isDestroyed;
        var isDisabled = !instance.state.isEnabled;
        var isTouchAndTouchDisabled = currentInput.isTouch && !instance.props.touch;
        var duration = getValueAtIndexOrReturn(instance.props.duration, 0, defaultProps.duration);

        if (isAlreadyVisible || isDestroyed || isDisabled || isTouchAndTouchDisabled) {
          return;
        } // Normalize `disabled` behavior across browsers.
        // Firefox allows events on disabled elements, but Chrome doesn't.
        // Using a wrapper element (i.e. <span>) is recommended.


        if (getCurrentTarget().hasAttribute('disabled')) {
          return;
        }

        invokeHook('onShow', [instance], false);

        if (instance.props.onShow(instance) === false) {
          return;
        }

        instance.state.isVisible = true;

        if (getIsDefaultRenderFn()) {
          popper.style.visibility = 'visible';
        }

        handleStyles();
        addDocumentMouseDownListener();

        if (!instance.state.isMounted) {
          popper.style.transition = 'none';
        } // If flipping to the opposite side after hiding at least once, the
        // animation will use the wrong placement without resetting the duration


        if (getIsDefaultRenderFn()) {
          var _getDefaultTemplateCh2 = getDefaultTemplateChildren(),
              box = _getDefaultTemplateCh2.box,
              content = _getDefaultTemplateCh2.content;

          setTransitionDuration([box, content], 0);
        }

        onFirstUpdate = function onFirstUpdate() {
          if (!instance.state.isVisible || ignoreOnFirstUpdate) {
            return;
          }

          ignoreOnFirstUpdate = true; // reflow

          void popper.offsetHeight;
          popper.style.transition = instance.props.moveTransition;

          if (getIsDefaultRenderFn() && instance.props.animation) {
            var _getDefaultTemplateCh3 = getDefaultTemplateChildren(),
                _box = _getDefaultTemplateCh3.box,
                _content = _getDefaultTemplateCh3.content;

            setTransitionDuration([_box, _content], duration);
            setVisibilityState([_box, _content], 'visible');
          }

          handleAriaContentAttribute();
          handleAriaExpandedAttribute();
          pushIfUnique(mountedInstances, instance);
          updateIOSClass(true);
          instance.state.isMounted = true;
          invokeHook('onMount', [instance]);

          if (instance.props.animation && getIsDefaultRenderFn()) {
            onTransitionedIn(duration, function () {
              instance.state.isShown = true;
              invokeHook('onShown', [instance]);
            });
          }
        };

        mount();
      }

      function hide() {


        var isAlreadyHidden = !instance.state.isVisible;
        var isDestroyed = instance.state.isDestroyed;
        var isDisabled = !instance.state.isEnabled;
        var duration = getValueAtIndexOrReturn(instance.props.duration, 1, defaultProps.duration);

        if (isAlreadyHidden || isDestroyed || isDisabled) {
          return;
        }

        invokeHook('onHide', [instance], false);

        if (instance.props.onHide(instance) === false) {
          return;
        }

        instance.state.isVisible = false;
        instance.state.isShown = false;
        ignoreOnFirstUpdate = false;

        if (getIsDefaultRenderFn()) {
          popper.style.visibility = 'hidden';
        }

        cleanupInteractiveMouseListeners();
        removeDocumentMouseDownListener();
        handleStyles();

        if (getIsDefaultRenderFn()) {
          var _getDefaultTemplateCh4 = getDefaultTemplateChildren(),
              box = _getDefaultTemplateCh4.box,
              content = _getDefaultTemplateCh4.content;

          if (instance.props.animation) {
            setTransitionDuration([box, content], duration);
            setVisibilityState([box, content], 'hidden');
          }
        }

        handleAriaContentAttribute();
        handleAriaExpandedAttribute();

        if (instance.props.animation) {
          if (getIsDefaultRenderFn()) {
            onTransitionedOut(duration, instance.unmount);
          }
        } else {
          instance.unmount();
        }
      }

      function unmount() {
        if (instance.state.isVisible) {
          instance.hide();
        }

        if (!instance.state.isMounted) {
          return;
        }

        destroyPopperInstance(); // If a popper is not interactive, it will be appended outside the popper
        // tree by default. This seems mainly for interactive tippies, but we should
        // find a workaround if possible

        getNestedPopperTree().forEach(function (nestedPopper) {
          nestedPopper._tippy.unmount();
        });

        if (popper.parentNode) {
          popper.parentNode.removeChild(popper);
        }

        mountedInstances = mountedInstances.filter(function (i) {
          return i !== instance;
        });

        if (mountedInstances.length === 0) {
          updateIOSClass(false);
        }

        instance.state.isMounted = false;
        invokeHook('onHidden', [instance]);
      }

      function destroy() {

        if (instance.state.isDestroyed) {
          return;
        }

        instance.clearDelayTimeouts();
        instance.unmount();
        removeListeners();
        delete reference._tippy;
        instance.state.isDestroyed = true;
        invokeHook('onDestroy', [instance]);
      }
    }

    function tippy$1(targets, optionalProps) {
      if (optionalProps === void 0) {
        optionalProps = {};
      }

      var plugins = defaultProps.plugins.concat(optionalProps.plugins || []);

      bindGlobalEventListeners();
      var passedProps = Object.assign({}, optionalProps, {
        plugins: plugins
      });
      var elements = getArrayOfElements(targets);

      var instances = elements.reduce(function (acc, reference) {
        var instance = reference && createTippy(reference, passedProps);

        if (instance) {
          acc.push(instance);
        }

        return acc;
      }, []);
      return isElement(targets) ? instances[0] : instances;
    }

    tippy$1.defaultProps = defaultProps;
    tippy$1.setDefaultProps = setDefaultProps;
    tippy$1.currentInput = currentInput;

    tippy$1.setDefaultProps({
      render: render
    });

    function tippy(node, props) {
      tippy$1(node, props);
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

    function getFormattedDate(x) {
       let l = new Date(x);
       // return(`${months[l.getMonth()]} ${l.getDate()}, ${l.getFullYear()}`)
       return(`${l.getMonth()+1}/${l.getDate()}/${l.getFullYear().toString().slice(2,4)}`)
     }

    /* src/components/Viz.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/components/Viz.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	const constants_0 = sequential(/*colors*/ child_ctx[1]).domain([1, /*show*/ child_ctx[15].setlistFlat.length]);
    	child_ctx[16] = constants_0;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (71:2) {#each shows as show}
    function create_each_block_5(ctx) {
    	let div1;
    	let div0;
    	let a;
    	let t0_value = /*show*/ ctx[15].city + "";
    	let t0;
    	let t1;
    	let t2_value = /*show*/ ctx[15].state + "";
    	let t2;
    	let t3;
    	let t4_value = getFormattedDate(/*show*/ ctx[15].date) + "";
    	let t4;
    	let a_href_value;
    	let t5;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = text(", ");
    			t2 = text(t2_value);
    			t3 = text(" – ");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(a, "href", a_href_value = /*show*/ ctx[15].url);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-y0lldh");
    			add_location(a, file$1, 72, 23, 1717);
    			attr_dev(div0, "class", "label svelte-y0lldh");
    			add_location(div0, file$1, 72, 4, 1698);
    			attr_dev(div1, "class", "show svelte-y0lldh");
    			add_location(div1, file$1, 71, 4, 1675);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, a);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			append_dev(a, t3);
    			append_dev(a, t4);
    			append_dev(div1, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shows*/ 1 && t0_value !== (t0_value = /*show*/ ctx[15].city + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*shows*/ 1 && t2_value !== (t2_value = /*show*/ ctx[15].state + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*shows*/ 1 && t4_value !== (t4_value = getFormattedDate(/*show*/ ctx[15].date) + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*shows*/ 1 && a_href_value !== (a_href_value = /*show*/ ctx[15].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(71:2) {#each shows as show}",
    		ctx
    	});

    	return block;
    }

    // (84:12) {#each album.tracks as track}
    function create_each_block_4(ctx) {
    	let div1;
    	let div0;
    	let t_value = /*track*/ ctx[22].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(t_value);
    			attr_dev(div0, "class", "track svelte-y0lldh");
    			add_location(div0, file$1, 85, 14, 2145);
    			attr_dev(div1, "class", "cell svelte-y0lldh");
    			add_location(div1, file$1, 84, 12, 2112);
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
    		source: "(84:12) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (81:6) {#each discography as album}
    function create_each_block_3(ctx) {
    	let div;
    	let h3;
    	let t0_value = /*album*/ ctx[19].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let each_value_4 = /*album*/ ctx[19].tracks;
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
    			attr_dev(h3, "class", "svelte-y0lldh");
    			add_location(h3, file$1, 82, 10, 2036);
    			attr_dev(div, "class", "album svelte-y0lldh");
    			add_location(div, file$1, 81, 8, 2006);
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
    			if (dirty & /*discography*/ 32) {
    				each_value_4 = /*album*/ ctx[19].tracks;
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
    		source: "(81:6) {#each discography as album}",
    		ctx
    	});

    	return block;
    }

    // (99:16) {#each album.tracks as track}
    function create_each_block_2(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let div0_data_index_value;
    	let tippy_action;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*track*/ ctx[22]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[12](/*track*/ ctx[22], /*show*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", div0_class_value = "track " + (/*track*/ ctx[22].played ? 'played' : 'hidden') + " svelte-y0lldh");

    			set_style(div0, "background", /*track*/ ctx[22].played
    			? /*colorScale*/ ctx[16](/*track*/ ctx[22].index)
    			: '');

    			attr_dev(div0, "data-index", div0_data_index_value = /*track*/ ctx[22].index);
    			add_location(div0, file$1, 100, 20, 2641);
    			attr_dev(div1, "class", "cell svelte-y0lldh");
    			add_location(div1, file$1, 99, 18, 2602);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(tippy_action = tippy.call(null, div0, /*generateProps*/ ctx[7](/*show*/ ctx[15], /*track*/ ctx[22].name))),
    					listen_dev(div0, "click", click_handler, false, false, false),
    					listen_dev(div0, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(div0, "mouseleave", /*mouseleave_handler*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*shows*/ 1 && div0_class_value !== (div0_class_value = "track " + (/*track*/ ctx[22].played ? 'played' : 'hidden') + " svelte-y0lldh")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*shows, colors*/ 3) {
    				set_style(div0, "background", /*track*/ ctx[22].played
    				? /*colorScale*/ ctx[16](/*track*/ ctx[22].index)
    				: '');
    			}

    			if (dirty & /*shows*/ 1 && div0_data_index_value !== (div0_data_index_value = /*track*/ ctx[22].index)) {
    				attr_dev(div0, "data-index", div0_data_index_value);
    			}

    			if (tippy_action && is_function(tippy_action.update) && dirty & /*shows*/ 1) tippy_action.update.call(null, /*generateProps*/ ctx[7](/*show*/ ctx[15], /*track*/ ctx[22].name));
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
    		source: "(99:16) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (96:10) {#each show.setlist as album}
    function create_each_block_1(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let each_value_2 = /*album*/ ctx[19].tracks;
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

    			attr_dev(h3, "class", "svelte-y0lldh");
    			add_location(h3, file$1, 97, 14, 2522);
    			attr_dev(div, "class", "album svelte-y0lldh");
    			add_location(div, file$1, 96, 12, 2488);
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
    			if (dirty & /*shows, scaleSequential, colors, generateProps, onHover, player*/ 203) {
    				each_value_2 = /*album*/ ctx[19].tracks;
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
    		source: "(96:10) {#each show.setlist as album}",
    		ctx
    	});

    	return block;
    }

    // (93:6) {#each shows as show}
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
    			add_location(div, file$1, 94, 8, 2414);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shows, scaleSequential, colors, generateProps, onHover, player*/ 203) {
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
    		source: "(93:6) {#each shows as show}",
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

    	let each_value_3 = /*discography*/ ctx[5];
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

    			if (!src_url_equal(audio.src, audio_src_value = /*src*/ ctx[2])) attr_dev(audio, "src", audio_src_value);
    			add_location(audio, file$1, 59, 2, 1491);
    			attr_dev(div0, "id", "head");
    			attr_dev(div0, "class", "svelte-y0lldh");
    			add_location(div0, file$1, 69, 2, 1631);
    			attr_dev(div1, "id", "discography");
    			attr_dev(div1, "class", "svelte-y0lldh");
    			add_location(div1, file$1, 79, 4, 1940);
    			attr_dev(div2, "id", "concerts");
    			attr_dev(div2, "class", "svelte-y0lldh");
    			add_location(div2, file$1, 91, 4, 2266);
    			attr_dev(div3, "id", "table");
    			attr_dev(div3, "class", "svelte-y0lldh");
    			add_location(div3, file$1, 78, 2, 1919);
    			attr_dev(div4, "id", "viz");
    			attr_dev(div4, "class", "svelte-y0lldh");
    			add_location(div4, file$1, 67, 0, 1613);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio, anchor);
    			/*audio_binding*/ ctx[8](audio);

    			if (!isNaN(/*$volume*/ ctx[4][0])) {
    				audio.volume = /*$volume*/ ctx[4][0];
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
    			if (dirty & /*src*/ 4 && !src_url_equal(audio.src, audio_src_value = /*src*/ ctx[2])) {
    				attr_dev(audio, "src", audio_src_value);
    			}

    			if (dirty & /*$volume*/ 16 && !isNaN(/*$volume*/ ctx[4][0])) {
    				audio.volume = /*$volume*/ ctx[4][0];
    			}

    			if (dirty & /*shows, getFormattedDate*/ 1) {
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

    			if (dirty & /*discography*/ 32) {
    				each_value_3 = /*discography*/ ctx[5];
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

    			if (dirty & /*shows, scaleSequential, colors, generateProps, onHover, player*/ 203) {
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
    	validate_store(volume, 'volume');
    	component_subscribe($$self, volume, $$value => $$invalidate(4, $volume = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Viz', slots, []);
    	let { shows } = $$props;
    	console.log(shows);

    	// shows.forEach(show => show.setlistFlat = show.setlist.map(album => album.tracks.filter(track => track.played)).flat().sort((a,b) => a.index - b.index))
    	let discography = shows[0].setlist;

    	let player;
    	let src;
    	let { colors } = $$props;
    	let normalize = str => str.toLowerCase().replace("two", "2").replace(/[^a-zA-Z ]/g, "");

    	// const getColor =  => {
    	//   let colorScale = scaleSequential(colors).domain([1, show.setlist.map(album => album.tracks.filter(track => track.played)).flat().length()])
    	// }
    	const onHover = (preview_url, show) => {
    		player.pause();
    		$$invalidate(2, src = preview_url);
    		player.play();
    	};

    	const generateProps = (show, song) => {
    		let setlistHTML = show.setlistFlat.map((track, i) => {
    			if (normalize(track) == normalize(song)) {
    				return `<li class="active">${i + 1}. ${track} <img src="./assets/equalizer-animation.gif"/></li>`;
    			} else {
    				return `<li>${i + 1}. ${track}</li>`;
    			}
    		}).join('');

    		let props = {
    			allowHTML: true,
    			// interactive: true,
    			content: `
        <h4>${show.venue}, ${show.city}, ${show.state} on ${getFormattedDate(show.date)}</h4>
        <ul>
          ${setlistHTML}
        </ul>
      `
    		};

    		return props;
    	};

    	const writable_props = ['shows', 'colors'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Viz> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			player = $$value;
    			$$invalidate(3, player);
    		});
    	}

    	function audio_volumechange_handler() {
    		$volume[0] = this.volume;
    		volume.set($volume);
    	}

    	const canplay_handler = () => player.play();
    	const click_handler = track => onHover(track.preview_url);
    	const mouseenter_handler = (track, show) => onHover(track.preview_url, show);
    	const mouseleave_handler = () => player.pause();

    	$$self.$$set = $$props => {
    		if ('shows' in $$props) $$invalidate(0, shows = $$props.shows);
    		if ('colors' in $$props) $$invalidate(1, colors = $$props.colors);
    	};

    	$$self.$capture_state = () => ({
    		tippy,
    		scaleSequential: sequential,
    		volume,
    		getFormattedDate,
    		shows,
    		discography,
    		player,
    		src,
    		colors,
    		normalize,
    		onHover,
    		generateProps,
    		$volume
    	});

    	$$self.$inject_state = $$props => {
    		if ('shows' in $$props) $$invalidate(0, shows = $$props.shows);
    		if ('discography' in $$props) $$invalidate(5, discography = $$props.discography);
    		if ('player' in $$props) $$invalidate(3, player = $$props.player);
    		if ('src' in $$props) $$invalidate(2, src = $$props.src);
    		if ('colors' in $$props) $$invalidate(1, colors = $$props.colors);
    		if ('normalize' in $$props) normalize = $$props.normalize;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*src*/ 4) ;
    	};

    	return [
    		shows,
    		colors,
    		src,
    		player,
    		$volume,
    		discography,
    		onHover,
    		generateProps,
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { shows: 0, colors: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Viz",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*shows*/ ctx[0] === undefined && !('shows' in props)) {
    			console_1.warn("<Viz> was created without expected prop 'shows'");
    		}

    		if (/*colors*/ ctx[1] === undefined && !('colors' in props)) {
    			console_1.warn("<Viz> was created without expected prop 'colors'");
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
    		date: "2022-05-10T00:00:00.000Z",
    		venue: "Thalia Hall",
    		city: "Chicago",
    		state: "IL",
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/thalia-hall-chicago-il-6bb7ea0e.html"
    		],
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
    						index: 8
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
    						played: true,
    						index: 5
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
    				name: "Cleo's Ferry Cemetery",
    				tracks: [
    					{
    						name: "Cleo's Ferry Cemetery",
    						preview_url: "https://p.scdn.co/mp3-preview/e0f48d4e69dc22889c218710c7a8c070b7f11499?cid=774b29d4f13844c495f206cafdad9c86",
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
    						played: true,
    						index: 14
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
    						played: true,
    						index: 2
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
    						played: true,
    						index: 12
    					},
    					{
    						name: "Aubergine",
    						preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 10
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
    						index: 4
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
    						played: false
    					},
    					{
    						name: "The Dryness And The Rain",
    						preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Wolf Am I! (And Shadow)",
    						preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 1
    					},
    					{
    						name: "Yellow Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "A Glass Can Only Spill What It Contains",
    						preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 13
    					},
    					{
    						name: "Nice And Blue (Pt. 2)",
    						preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "The Sun And The Moon",
    						preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Orange Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "C-Minor",
    						preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "In A Market Dimly Lit",
    						preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "O, Porcupine",
    						preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Brownish Spider",
    						preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "In A Sweater Poorly Knit",
    						preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 19
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
    						index: 18
    					},
    					{
    						name: "January 1979",
    						preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 11
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
    						index: 3
    					},
    					{
    						name: "The Soviet",
    						preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    						played: false
    					},
    					{
    						name: "Paper-Hanger",
    						preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 7
    					},
    					{
    						name: "My Exit, Unfair",
    						preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 0
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
    						index: 20
    					}
    				]
    			},
    			{
    				name: "A To B Life",
    				tracks: [
    					{
    						name: "Bullet To Binary",
    						preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    						played: true,
    						index: 6
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
    						played: true,
    						index: 9
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
    		],
    		setlistFlat: [
    			"My Exit, Unfair",
    			"Wolf Am I! (And Shadow)",
    			"Grist for the Malady Mill",
    			"Seven Sisters",
    			"Goodbye, I!",
    			"August 6th",
    			"Bullet to Binary",
    			"Paper Hanger",
    			"Bethlehem, WV",
    			"Gentlemen",
    			"Aubergine",
    			"January 1979",
    			"Elephant in the Dock",
    			"A Glass Can Only Spill What It Contains",
    			"Lilac Queen",
    			"Julia (or, 'Holy to the LORD' on the Bells of Horses)",
    			"Rainbow Signs",
    			"9:27a.m., 7/29",
    			"Torches Together",
    			"In a Sweater Poorly Knit",
    			"Son of a Widow"
    		]
    	}
    ];

    /* src/App.svelte generated by Svelte v3.47.0 */
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
    			attr_dev(div0, "class", "side-by-side svelte-1n2qpom");
    			add_location(div0, file, 19, 2, 426);
    			attr_dev(main, "id", "App");
    			add_location(main, file, 15, 0, 384);
    			attr_dev(div1, "class", "svelte-1n2qpom");
    			add_location(div1, file, 30, 0, 565);
    			attr_dev(footer, "class", "svelte-1n2qpom");
    			add_location(footer, file, 29, 0, 556);
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
    	validate_slots('App', slots, []);
    	let colors = ["#edf8b1", "#4d98cc"];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
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
    		if ('colors' in $$props) $$invalidate(0, colors = $$props.colors);
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

})();
//# sourceMappingURL=bundle.js.map
