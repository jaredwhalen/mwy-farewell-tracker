
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    const file$5 = "src/Meta.svelte";

    function create_fragment$5(ctx) {
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
    			add_location(meta0, file$5, 5, 2, 90);
    			attr_dev(meta1, "http-equiv", "X-UA-Compatible");
    			attr_dev(meta1, "content", "IE=edge");
    			add_location(meta1, file$5, 6, 2, 117);
    			attr_dev(meta2, "name", "viewport");
    			attr_dev(meta2, "content", "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no");
    			add_location(meta2, file$5, 7, 2, 175);
    			attr_dev(meta3, "property", "fullbleed");
    			attr_dev(meta3, "content", "false");
    			add_location(meta3, file$5, 11, 2, 310);
    			attr_dev(meta4, "property", "slug");
    			attr_dev(meta4, "content", projectConfig.project.slug);
    			add_location(meta4, file$5, 12, 2, 358);
    			attr_dev(link, "rel", "icon");
    			attr_dev(link, "type", "image/png");
    			attr_dev(link, "href", "https://static.axios.com/img/axiosvisuals-favicon-128x128.png");
    			attr_dev(link, "sizes", "128x128");
    			add_location(link, file$5, 13, 2, 422);
    			attr_dev(meta5, "property", "apple-fallback");
    			attr_dev(meta5, "content", `fallbacks/${projectConfig.project.slug}-apple.png`);
    			add_location(meta5, file$5, 19, 2, 564);
    			attr_dev(meta6, "property", "newsletter-fallback");
    			attr_dev(meta6, "content", `fallbacks/${projectConfig.project.slug}-fallback.png`);
    			add_location(meta6, file$5, 23, 2, 673);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Meta",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.38.2 */

    const file$4 = "src/components/Header.svelte";

    function create_fragment$4(ctx) {
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
    	let a0;
    	let svg0;
    	let g;
    	let path0;
    	let t9;
    	let a1;
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
    			a0 = element("a");
    			svg0 = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			t9 = space();
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			attr_dev(div0, "class", "svelte-1dxn9cr");
    			add_location(div0, file$4, 3, 2, 34);
    			attr_dev(div1, "class", "svelte-1dxn9cr");
    			add_location(div1, file$4, 4, 2, 51);
    			attr_dev(div2, "class", "svelte-1dxn9cr");
    			add_location(div2, file$4, 5, 2, 77);
    			attr_dev(span, "class", "svelte-1dxn9cr");
    			add_location(span, file$4, 6, 12, 111);
    			attr_dev(div3, "class", "svelte-1dxn9cr");
    			add_location(div3, file$4, 6, 2, 101);
    			attr_dev(div4, "class", "h-stack svelte-1dxn9cr");
    			add_location(div4, file$4, 2, 0, 10);
    			attr_dev(path0, "d", "M-3.11,410.8c56,5,106.56-8.77,152.36-43.23-47.89-4.13-79.86-28.14-97.63-73.21,16,2.44,30.77,2.3,46.51-1.91-24.84-6.09-44.73-18.21-60-37.41S15.32,213.9,15.38,188.45c14.65,7.48,29.37,12.07,46.68,12.78-22.82-16.77-37.49-37.61-43.29-64.17C13,110.68,17,85.73,30.31,61.75q85.13,100,214.85,109.34c-.33-11.08-1.75-21.73-.76-32.15,4-42.5,26-73.13,65.46-88.78,41.28-16.37,79.22-8,112,22.16,2.48,2.28,4.55,2.9,7.83,2.12,19.82-4.68,38.77-11.52,56.54-21.53,1.43-.8,2.92-1.5,5.38-2.76-8.05,24.47-22.71,42.58-42.92,57.38,6.13-1.11,12.31-2,18.36-3.37,6.46-1.5,12.85-3.33,19.16-5.34,6.1-1.95,12.07-4.32,19.55-7-4.48,6-7.57,11.41-11.78,15.66-11.9,12-24.14,23.72-36.54,35.23-2.56,2.38-3.77,4.42-3.69,7.93,1.32,62.37-15.12,119.9-48.67,172.3C361.52,391,300.21,434.46,220.88,451,155.93,464.6,92.65,458.29,32,430.75c-12.17-5.52-23.75-12.33-35.6-18.55Z");
    			attr_dev(path0, "transform", "translate(3.64 -41.93)");
    			add_location(path0, file$4, 14, 10, 383);
    			attr_dev(g, "id", "tfnVb0.tif");
    			add_location(g, file$4, 13, 8, 353);
    			attr_dev(svg0, "id", "twitter");
    			attr_dev(svg0, "data-name", "twitter");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 509.42 416");
    			attr_dev(svg0, "class", "svelte-1dxn9cr");
    			add_location(svg0, file$4, 12, 6, 246);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", "https://twitter.com/jared_whalen");
    			add_location(a0, file$4, 11, 4, 180);
    			attr_dev(path1, "d", "M249.88,233.65a16.29,16.29,0,0,0-5.15,31.75c.81.15,1.11-.35,1.11-.78s0-1.41,0-2.77c-4.53,1-5.49-2.19-5.49-2.19a4.3,4.3,0,0,0-1.81-2.38c-1.48-1,.11-1,.11-1a3.41,3.41,0,0,1,2.5,1.68,3.46,3.46,0,0,0,4.74,1.35,3.54,3.54,0,0,1,1-2.18c-3.61-.41-7.42-1.8-7.42-8a6.3,6.3,0,0,1,1.68-4.37,5.82,5.82,0,0,1,.16-4.31s1.37-.44,4.48,1.67a15.41,15.41,0,0,1,8.16,0c3.11-2.11,4.47-1.67,4.47-1.67a5.82,5.82,0,0,1,.16,4.31,6.26,6.26,0,0,1,1.68,4.37c0,6.26-3.81,7.64-7.44,8a3.91,3.91,0,0,1,1.11,3c0,2.18,0,3.93,0,4.47s.29.94,1.12.78a16.3,16.3,0,0,0-5.16-31.75Z");
    			attr_dev(path1, "transform", "translate(-233.59 -233.65)");
    			set_style(path1, "fill", "#dddddd");
    			set_style(path1, "fill-rule", "evenodd");
    			add_location(path1, file$4, 22, 8, 1510);
    			attr_dev(svg1, "id", "github");
    			attr_dev(svg1, "data-name", "github");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 32.58 31.77");
    			attr_dev(svg1, "class", "svelte-1dxn9cr");
    			add_location(svg1, file$4, 21, 6, 1404);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "href", "https://github.com/jaredwhalen/concert-log");
    			add_location(a1, file$4, 20, 4, 1328);
    			attr_dev(div5, "class", "g-share svelte-1dxn9cr");
    			add_location(div5, file$4, 10, 2, 154);
    			attr_dev(header, "class", "svelte-1dxn9cr");
    			add_location(header, file$4, 0, 0, 0);
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
    			append_dev(div5, a0);
    			append_dev(a0, svg0);
    			append_dev(svg0, g);
    			append_dev(g, path0);
    			append_dev(div5, t9);
    			append_dev(div5, a1);
    			append_dev(a1, svg1);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Intro.svelte generated by Svelte v3.38.2 */

    const file$3 = "src/components/Intro.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let span;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "L";
    			t1 = text("orem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in lobortis diam. Cras egestas mollis lorem, sit amet porttitor nibh vehicula eget. Ut a luctus libero. Duis commodo id ligula vel lacinia. In fringilla urna velit, a fermentum enim rutrum at. Nullam posuere in enim eu congue. Pellentesque sit amet elit id justo dignissim condimentum. Sed vestibulum, tellus et fermentum elementum, est nisl consectetur neque, non hendrerit lacus lectus sit amet elit. Morbi sit amet nibh et lorem venenatis porta vel vel tellus. Mauris quis magna malesuada elit sagittis consectetur sit amet ut turpis.");
    			attr_dev(span, "class", "firstcharacter svelte-11fvekk");
    			add_location(span, file$3, 5, 0, 41);
    			attr_dev(div, "class", "intro svelte-11fvekk");
    			add_location(div, file$3, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(div, t1);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Intro",
    			options,
    			id: create_fragment$3.name
    		});
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

    /* src/components/Legend.svelte generated by Svelte v3.38.2 */

    const file$2 = "src/components/Legend.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let svg;
    	let defs;
    	let linearGradient;
    	let stop0;
    	let stop0_stop_color_value;
    	let stop1;
    	let stop1_stop_color_value;
    	let rect;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Earlier in set\n\n");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			linearGradient = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			rect = svg_element("rect");
    			t1 = text("\nLater in set");
    			attr_dev(stop0, "offset", "5%");
    			attr_dev(stop0, "stop-color", stop0_stop_color_value = /*colors*/ ctx[0][0]);
    			add_location(stop0, file$2, 10, 6, 158);
    			attr_dev(stop1, "offset", "95%");
    			attr_dev(stop1, "stop-color", stop1_stop_color_value = /*colors*/ ctx[0][1]);
    			add_location(stop1, file$2, 11, 6, 211);
    			attr_dev(linearGradient, "id", "gradient");
    			add_location(linearGradient, file$2, 9, 4, 121);
    			add_location(defs, file$2, 8, 2, 110);
    			attr_dev(rect, "width", "100%");
    			attr_dev(rect, "height", "100%");
    			attr_dev(rect, "fill", "url('#gradient')");
    			add_location(rect, file$2, 16, 2, 329);
    			attr_dev(svg, "width", "100px");
    			attr_dev(svg, "height", "20px");
    			add_location(svg, file$2, 7, 0, 74);
    			attr_dev(div, "id", "Legend");
    			attr_dev(div, "class", "svelte-2h59y6");
    			add_location(div, file$2, 4, 0, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, svg);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient);
    			append_dev(linearGradient, stop0);
    			append_dev(linearGradient, stop1);
    			append_dev(svg, rect);
    			append_dev(div, t1);
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
    			if (detaching) detach_dev(div);
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { colors: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Legend",
    			options,
    			id: create_fragment$2.name
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

    /* src/components/Viz.svelte generated by Svelte v3.38.2 */
    const file$1 = "src/components/Viz.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (41:2) {#each shows as show}
    function create_each_block_5(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*show*/ ctx[12].city + "";
    	let t0;
    	let t1;
    	let t2_value = /*show*/ ctx[12].state + "";
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
    			attr_dev(div0, "class", "label svelte-fhmyuk");
    			add_location(div0, file$1, 42, 6, 769);
    			attr_dev(div1, "class", "show svelte-fhmyuk");
    			add_location(div1, file$1, 41, 4, 744);
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
    			if (dirty & /*shows*/ 1 && t0_value !== (t0_value = /*show*/ ctx[12].city + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*shows*/ 1 && t2_value !== (t2_value = /*show*/ ctx[12].state + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(41:2) {#each shows as show}",
    		ctx
    	});

    	return block;
    }

    // (53:12) {#each album.tracks as track}
    function create_each_block_4(ctx) {
    	let div1;
    	let div0;
    	let t_value = /*track*/ ctx[18].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(t_value);
    			attr_dev(div0, "class", "track svelte-fhmyuk");
    			add_location(div0, file$1, 54, 14, 1079);
    			attr_dev(div1, "class", "cell svelte-fhmyuk");
    			add_location(div1, file$1, 53, 12, 1046);
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
    		source: "(53:12) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (50:6) {#each discography as album}
    function create_each_block_3(ctx) {
    	let div;
    	let h3;
    	let t0_value = /*album*/ ctx[15].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let each_value_4 = /*album*/ ctx[15].tracks;
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
    			attr_dev(h3, "class", "svelte-fhmyuk");
    			add_location(h3, file$1, 51, 10, 970);
    			attr_dev(div, "class", "album svelte-fhmyuk");
    			add_location(div, file$1, 50, 8, 940);
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
    			if (dirty & /*discography*/ 8) {
    				each_value_4 = /*album*/ ctx[15].tracks;
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
    		source: "(50:6) {#each discography as album}",
    		ctx
    	});

    	return block;
    }

    // (67:16) {#each album.tracks as track}
    function create_each_block_2(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let div0_data_index_value;
    	let mounted;
    	let dispose;

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[9](/*track*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", div0_class_value = "track " + (/*track*/ ctx[18].played ? "played" : "hidden") + " svelte-fhmyuk");

    			set_style(div0, "background", /*track*/ ctx[18].played
    			? /*colorScale*/ ctx[5](/*track*/ ctx[18].index)
    			: "");

    			attr_dev(div0, "data-index", div0_data_index_value = /*track*/ ctx[18].index);
    			add_location(div0, file$1, 68, 20, 1483);
    			attr_dev(div1, "class", "cell svelte-fhmyuk");
    			add_location(div1, file$1, 67, 18, 1444);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(div0, "mouseleave", /*mouseleave_handler*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*shows*/ 1 && div0_class_value !== (div0_class_value = "track " + (/*track*/ ctx[18].played ? "played" : "hidden") + " svelte-fhmyuk")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*shows*/ 1) {
    				set_style(div0, "background", /*track*/ ctx[18].played
    				? /*colorScale*/ ctx[5](/*track*/ ctx[18].index)
    				: "");
    			}

    			if (dirty & /*shows*/ 1 && div0_data_index_value !== (div0_data_index_value = /*track*/ ctx[18].index)) {
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
    		source: "(67:16) {#each album.tracks as track}",
    		ctx
    	});

    	return block;
    }

    // (64:10) {#each show.setlist as album}
    function create_each_block_1(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let each_value_2 = /*album*/ ctx[15].tracks;
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

    			attr_dev(h3, "class", "svelte-fhmyuk");
    			add_location(h3, file$1, 65, 14, 1364);
    			attr_dev(div, "class", "album svelte-fhmyuk");
    			add_location(div, file$1, 64, 12, 1330);
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
    				each_value_2 = /*album*/ ctx[15].tracks;
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
    		source: "(64:10) {#each show.setlist as album}",
    		ctx
    	});

    	return block;
    }

    // (62:6) {#each shows as show}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*show*/ ctx[12].setlist;
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
    			add_location(div, file$1, 62, 8, 1256);
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
    				each_value_1 = /*show*/ ctx[12].setlist;
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
    		source: "(62:6) {#each shows as show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let audio;
    	let audio_src_value;
    	let t0;
    	let legend;
    	let t1;
    	let div4;
    	let div0;
    	let t2;
    	let div3;
    	let div1;
    	let t3;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;

    	legend = new Legend({
    			props: { colors: /*colors*/ ctx[4] },
    			$$inline: true
    		});

    	let each_value_5 = /*shows*/ ctx[0];
    	validate_each_argument(each_value_5);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_2[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_3 = /*discography*/ ctx[3];
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
    			create_component(legend.$$.fragment);
    			t1 = space();
    			div4 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t2 = space();
    			div3 = element("div");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (audio.src !== (audio_src_value = /*src*/ ctx[1])) attr_dev(audio, "src", audio_src_value);
    			add_location(audio, file$1, 28, 2, 567);
    			attr_dev(div0, "id", "head");
    			attr_dev(div0, "class", "svelte-fhmyuk");
    			add_location(div0, file$1, 39, 2, 700);
    			attr_dev(div1, "id", "discography");
    			attr_dev(div1, "class", "svelte-fhmyuk");
    			add_location(div1, file$1, 48, 4, 874);
    			attr_dev(div2, "id", "concerts");
    			attr_dev(div2, "class", "svelte-fhmyuk");
    			add_location(div2, file$1, 60, 4, 1200);
    			attr_dev(div3, "id", "table");
    			attr_dev(div3, "class", "svelte-fhmyuk");
    			add_location(div3, file$1, 47, 2, 853);
    			attr_dev(div4, "id", "viz");
    			attr_dev(div4, "class", "svelte-fhmyuk");
    			add_location(div4, file$1, 37, 0, 682);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, audio, anchor);
    			/*audio_binding*/ ctx[7](audio);
    			insert_dev(target, t0, anchor);
    			mount_component(legend, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div3, t3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(audio, "canplay", /*canplay_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*src*/ 2 && audio.src !== (audio_src_value = /*src*/ ctx[1])) {
    				attr_dev(audio, "src", audio_src_value);
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

    			if (dirty & /*discography*/ 8) {
    				each_value_3 = /*discography*/ ctx[3];
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(legend.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(legend.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(audio);
    			/*audio_binding*/ ctx[7](null);
    			if (detaching) detach_dev(t0);
    			destroy_component(legend, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Viz", slots, []);
    	let { shows } = $$props;
    	let discography = shows[0].setlist;
    	let player;
    	let src;
    	let maxNumberOfSongs = shows.map(d => d.setlist.map(a => a.tracks.filter(t => t.played).length).reduce((a, b) => a + b, 0)).sort((a, b) => b - a)[0];
    	let colors = ["#edf8b1", "#2c7fb8"];
    	let colorScale = sequential(colors).domain([1, maxNumberOfSongs]);

    	const onHover = preview_url => {
    		player.pause();
    		$$invalidate(1, src = preview_url);
    		player.play();
    	};

    	const writable_props = ["shows"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Viz> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			player = $$value;
    			$$invalidate(2, player);
    		});
    	}

    	const canplay_handler = () => player.play();
    	const mouseenter_handler = track => onHover(track.preview_url);
    	const mouseleave_handler = () => player.pause();

    	$$self.$$set = $$props => {
    		if ("shows" in $$props) $$invalidate(0, shows = $$props.shows);
    	};

    	$$self.$capture_state = () => ({
    		scaleSequential: sequential,
    		Legend,
    		shows,
    		discography,
    		player,
    		src,
    		maxNumberOfSongs,
    		colors,
    		colorScale,
    		onHover
    	});

    	$$self.$inject_state = $$props => {
    		if ("shows" in $$props) $$invalidate(0, shows = $$props.shows);
    		if ("discography" in $$props) $$invalidate(3, discography = $$props.discography);
    		if ("player" in $$props) $$invalidate(2, player = $$props.player);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    		if ("maxNumberOfSongs" in $$props) maxNumberOfSongs = $$props.maxNumberOfSongs;
    		if ("colors" in $$props) $$invalidate(4, colors = $$props.colors);
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
    		discography,
    		colors,
    		colorScale,
    		onHover,
    		audio_binding,
    		canplay_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class Viz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { shows: 0 });

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
    	}

    	get shows() {
    		throw new Error("<Viz>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set shows(value) {
    		throw new Error("<Viz>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var discography = [
    	{
    		name: "[untitled] e.p.",
    		release_date: "2018-08-17",
    		id: "0Vb3wyIEmsCfdCQ5xa32Ap",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 215927,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6JqZOB6KrVrEfFKP6hUHA7"
    				},
    				href: "https://api.spotify.com/v1/tracks/6JqZOB6KrVrEfFKP6hUHA7",
    				id: "6JqZOB6KrVrEfFKP6hUHA7",
    				is_local: false,
    				name: "Bethlehem, WV",
    				preview_url: "https://p.scdn.co/mp3-preview/f2c50ff3d67621ed8079d63168c80067d5460210?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:6JqZOB6KrVrEfFKP6hUHA7"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 204010,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4CQYR9GkSixXejZWgRkO9p"
    				},
    				href: "https://api.spotify.com/v1/tracks/4CQYR9GkSixXejZWgRkO9p",
    				id: "4CQYR9GkSixXejZWgRkO9p",
    				is_local: false,
    				name: "Winter Solstice (alt. version)",
    				preview_url: "https://p.scdn.co/mp3-preview/1f33a37f7afb4dca18651dd7842b97f9984c8495?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:4CQYR9GkSixXejZWgRkO9p"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 201357,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2Xh7ZmkXiFpzLCGBsG7ov7"
    				},
    				href: "https://api.spotify.com/v1/tracks/2Xh7ZmkXiFpzLCGBsG7ov7",
    				id: "2Xh7ZmkXiFpzLCGBsG7ov7",
    				is_local: false,
    				name: "Dirty Air",
    				preview_url: "https://p.scdn.co/mp3-preview/373fb65fa1b26964c5ced0f0c623fb9fd62dcde6?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:2Xh7ZmkXiFpzLCGBsG7ov7"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 304852,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6AjlPvZKU1rrgg0KaLpeoz"
    				},
    				href: "https://api.spotify.com/v1/tracks/6AjlPvZKU1rrgg0KaLpeoz",
    				id: "6AjlPvZKU1rrgg0KaLpeoz",
    				is_local: false,
    				name: "Cities of the Plain",
    				preview_url: "https://p.scdn.co/mp3-preview/6a3ba156d156416cb1f305778253f4d87becd59a?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:6AjlPvZKU1rrgg0KaLpeoz"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 204766,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4ArcQVX9mm70CHr0HeY6dN"
    				},
    				href: "https://api.spotify.com/v1/tracks/4ArcQVX9mm70CHr0HeY6dN",
    				id: "4ArcQVX9mm70CHr0HeY6dN",
    				is_local: false,
    				name: "Existential Dread, Six Hours’ Time",
    				preview_url: "https://p.scdn.co/mp3-preview/e1c10883bbee759b3d15d0ade80451dacc0148e9?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:4ArcQVX9mm70CHr0HeY6dN"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 207751,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1DZKg6ZOybAYzFA6DHkVYO"
    				},
    				href: "https://api.spotify.com/v1/tracks/1DZKg6ZOybAYzFA6DHkVYO",
    				id: "1DZKg6ZOybAYzFA6DHkVYO",
    				is_local: false,
    				name: "August 6th",
    				preview_url: "https://p.scdn.co/mp3-preview/e4cd90acd974042a490ee609a642d1d4c2748783?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:1DZKg6ZOybAYzFA6DHkVYO"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 184221,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/113Mg8S5F6QnAY7qz1ZZyT"
    				},
    				href: "https://api.spotify.com/v1/tracks/113Mg8S5F6QnAY7qz1ZZyT",
    				id: "113Mg8S5F6QnAY7qz1ZZyT",
    				is_local: false,
    				name: "Kristy w/ the Sparkling Teeth",
    				preview_url: "https://p.scdn.co/mp3-preview/77ef20b612f04bd14c2e0f6c4902f39d45235e18?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:113Mg8S5F6QnAY7qz1ZZyT"
    			}
    		]
    	},
    	{
    		name: "Pale Horses",
    		release_date: "2015-06-16",
    		id: "7n1q6m46xIib3HqSIIpkAs",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 145989,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5j8kBsa0Jai0pBwfE4YGeX"
    				},
    				href: "https://api.spotify.com/v1/tracks/5j8kBsa0Jai0pBwfE4YGeX",
    				id: "5j8kBsa0Jai0pBwfE4YGeX",
    				is_local: false,
    				name: "Pale Horse",
    				preview_url: "https://p.scdn.co/mp3-preview/8aff816e27b8bc38f21c447b3cc75adc2faf309c?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:5j8kBsa0Jai0pBwfE4YGeX"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 188812,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2irwsebjTUoxDN83rQH75g"
    				},
    				href: "https://api.spotify.com/v1/tracks/2irwsebjTUoxDN83rQH75g",
    				id: "2irwsebjTUoxDN83rQH75g",
    				is_local: false,
    				name: "Watermelon Ascot",
    				preview_url: "https://p.scdn.co/mp3-preview/fefd37f601e95ab3a1fa2fc8c4c941977bf83160?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:2irwsebjTUoxDN83rQH75g"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 199669,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6lhHSFqJ6BkOWI0cfK8xo8"
    				},
    				href: "https://api.spotify.com/v1/tracks/6lhHSFqJ6BkOWI0cfK8xo8",
    				id: "6lhHSFqJ6BkOWI0cfK8xo8",
    				is_local: false,
    				name: "D-Minor",
    				preview_url: "https://p.scdn.co/mp3-preview/184b2d7d6b19828c367a352216752f8bc9003b65?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:6lhHSFqJ6BkOWI0cfK8xo8"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 214587,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2od8ii6qJgijGdxCQzf9Cf"
    				},
    				href: "https://api.spotify.com/v1/tracks/2od8ii6qJgijGdxCQzf9Cf",
    				id: "2od8ii6qJgijGdxCQzf9Cf",
    				is_local: false,
    				name: "Mexican War Streets",
    				preview_url: "https://p.scdn.co/mp3-preview/ce0e09876888204a712eba9abdcb7c059c21fbc5?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:2od8ii6qJgijGdxCQzf9Cf"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 239714,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3aeIG31zaEwmHGbcTS3diw"
    				},
    				href: "https://api.spotify.com/v1/tracks/3aeIG31zaEwmHGbcTS3diw",
    				id: "3aeIG31zaEwmHGbcTS3diw",
    				is_local: false,
    				name: "Red Cow",
    				preview_url: "https://p.scdn.co/mp3-preview/9e82cbd08453cc5a3672795a4c96a9f9ab0ce64d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:3aeIG31zaEwmHGbcTS3diw"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 99806,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6VGTaT9H4xmaOO5m87YJlF"
    				},
    				href: "https://api.spotify.com/v1/tracks/6VGTaT9H4xmaOO5m87YJlF",
    				id: "6VGTaT9H4xmaOO5m87YJlF",
    				is_local: false,
    				name: "Dorothy",
    				preview_url: "https://p.scdn.co/mp3-preview/18b16176702e455a29f674216206fb7add9bbab8?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:6VGTaT9H4xmaOO5m87YJlF"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 185291,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/04ah84J6OypsUAPDsnpzIA"
    				},
    				href: "https://api.spotify.com/v1/tracks/04ah84J6OypsUAPDsnpzIA",
    				id: "04ah84J6OypsUAPDsnpzIA",
    				is_local: false,
    				name: "Blue Hen",
    				preview_url: "https://p.scdn.co/mp3-preview/5f63d11bd657f4366d77f593957ae1084353922d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:04ah84J6OypsUAPDsnpzIA"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 238110,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0vQjpavDBJa3BUZpM6HQD4"
    				},
    				href: "https://api.spotify.com/v1/tracks/0vQjpavDBJa3BUZpM6HQD4",
    				id: "0vQjpavDBJa3BUZpM6HQD4",
    				is_local: false,
    				name: "Lilac Queen",
    				preview_url: "https://p.scdn.co/mp3-preview/69556ccfd3545b885ade6671522b15e9df95eecb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:0vQjpavDBJa3BUZpM6HQD4"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 232140,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5qSf2OQyG2m8VJDfsMd3xU"
    				},
    				href: "https://api.spotify.com/v1/tracks/5qSf2OQyG2m8VJDfsMd3xU",
    				id: "5qSf2OQyG2m8VJDfsMd3xU",
    				is_local: false,
    				name: "Magic Lantern Days",
    				preview_url: "https://p.scdn.co/mp3-preview/6fa194c998588cf6a22270d84918bf03e386253d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:5qSf2OQyG2m8VJDfsMd3xU"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 257543,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3NfJnF8SZBkiGljzKBOzDu"
    				},
    				href: "https://api.spotify.com/v1/tracks/3NfJnF8SZBkiGljzKBOzDu",
    				id: "3NfJnF8SZBkiGljzKBOzDu",
    				is_local: false,
    				name: "Birnam Wood",
    				preview_url: "https://p.scdn.co/mp3-preview/e0b5cc98248c950ff9a3363b5abe67f1cab85126?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:3NfJnF8SZBkiGljzKBOzDu"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"CA",
    					"US"
    				],
    				disc_number: 1,
    				duration_ms: 363524,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4QrIkKLdCSFfsZxt72aoLD"
    				},
    				href: "https://api.spotify.com/v1/tracks/4QrIkKLdCSFfsZxt72aoLD",
    				id: "4QrIkKLdCSFfsZxt72aoLD",
    				is_local: false,
    				name: "Rainbow Signs",
    				preview_url: "https://p.scdn.co/mp3-preview/9222fbcbe08571e1f3aea80e985cab662f2a50a7?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:4QrIkKLdCSFfsZxt72aoLD"
    			}
    		]
    	},
    	{
    		name: "Other Stories",
    		release_date: "2012-06-20",
    		id: "6gcBqqDMVYZRWcFJZZurrf",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 243947,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2dZxqBx7gfyf0cuI5u1yon"
    				},
    				href: "https://api.spotify.com/v1/tracks/2dZxqBx7gfyf0cuI5u1yon",
    				id: "2dZxqBx7gfyf0cuI5u1yon",
    				is_local: false,
    				name: "Julian the Onion",
    				preview_url: "https://p.scdn.co/mp3-preview/4e5011113aaa83bb03cbfb4e8f037bb9102c1810?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:2dZxqBx7gfyf0cuI5u1yon"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 216272,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1gvZybq4SfKpFCZ3gUvkNz"
    				},
    				href: "https://api.spotify.com/v1/tracks/1gvZybq4SfKpFCZ3gUvkNz",
    				id: "1gvZybq4SfKpFCZ3gUvkNz",
    				is_local: false,
    				name: "Four Fires",
    				preview_url: "https://p.scdn.co/mp3-preview/2890916414733a61206bf015a5dfbd6b3ef5355b?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:1gvZybq4SfKpFCZ3gUvkNz"
    			}
    		]
    	},
    	{
    		name: "Brother, Sister",
    		release_date: "2006-01-01",
    		id: "4yItCYzksCSiB8RcUsAdSg",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 232600,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3NMFdFi82kdYIAuM7RoLNA"
    				},
    				href: "https://api.spotify.com/v1/tracks/3NMFdFi82kdYIAuM7RoLNA",
    				id: "3NMFdFi82kdYIAuM7RoLNA",
    				is_local: false,
    				name: "Messes Of Men",
    				preview_url: "https://p.scdn.co/mp3-preview/6bc5c1bf9289ff96aa93ebf5799167be505da581?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:3NMFdFi82kdYIAuM7RoLNA"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 177293,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1raM455RPhXAVrYU2Sb0tP"
    				},
    				href: "https://api.spotify.com/v1/tracks/1raM455RPhXAVrYU2Sb0tP",
    				id: "1raM455RPhXAVrYU2Sb0tP",
    				is_local: false,
    				name: "The Dryness And The Rain",
    				preview_url: "https://p.scdn.co/mp3-preview/209932350a36dcdd2697c0c32d2c49f2b6855062?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:1raM455RPhXAVrYU2Sb0tP"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 156973,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5IOjHxhDVsW9hCebpWIjkq"
    				},
    				href: "https://api.spotify.com/v1/tracks/5IOjHxhDVsW9hCebpWIjkq",
    				id: "5IOjHxhDVsW9hCebpWIjkq",
    				is_local: false,
    				name: "Wolf Am I! (And Shadow)",
    				preview_url: "https://p.scdn.co/mp3-preview/d8b20871b4563b659313fd2f31e0b8aa3b0b7785?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:5IOjHxhDVsW9hCebpWIjkq"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 70893,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2XpkKKeib9PCRW60q3Fkmn"
    				},
    				href: "https://api.spotify.com/v1/tracks/2XpkKKeib9PCRW60q3Fkmn",
    				id: "2XpkKKeib9PCRW60q3Fkmn",
    				is_local: false,
    				name: "Yellow Spider",
    				preview_url: "https://p.scdn.co/mp3-preview/ef14f409c51d11bc934ce04928d52a793313b9eb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:2XpkKKeib9PCRW60q3Fkmn"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 225866,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4EVu9dQCUpgLosa66xbYKC"
    				},
    				href: "https://api.spotify.com/v1/tracks/4EVu9dQCUpgLosa66xbYKC",
    				id: "4EVu9dQCUpgLosa66xbYKC",
    				is_local: false,
    				name: "A Glass Can Only Spill What It Contains",
    				preview_url: "https://p.scdn.co/mp3-preview/02f79e538ae2164f584008f641d6d81b4d911c69?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:4EVu9dQCUpgLosa66xbYKC"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 223866,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0bstHsoOdpxsQIsBsECJPn"
    				},
    				href: "https://api.spotify.com/v1/tracks/0bstHsoOdpxsQIsBsECJPn",
    				id: "0bstHsoOdpxsQIsBsECJPn",
    				is_local: false,
    				name: "Nice And Blue (Pt. 2)",
    				preview_url: "https://p.scdn.co/mp3-preview/64efaf46eaa44db36e4bdcd8ebd518b30c685016?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:0bstHsoOdpxsQIsBsECJPn"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 315506,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2Ipnp0UpNdgMK5DWBh3725"
    				},
    				href: "https://api.spotify.com/v1/tracks/2Ipnp0UpNdgMK5DWBh3725",
    				id: "2Ipnp0UpNdgMK5DWBh3725",
    				is_local: false,
    				name: "The Sun And The Moon",
    				preview_url: "https://p.scdn.co/mp3-preview/f8c2ad27c30a1cfbfbbd5db1ba303ba388ad5f8e?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:2Ipnp0UpNdgMK5DWBh3725"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 70333,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5vxsFNGBtAYzrYpNzadPkj"
    				},
    				href: "https://api.spotify.com/v1/tracks/5vxsFNGBtAYzrYpNzadPkj",
    				id: "5vxsFNGBtAYzrYpNzadPkj",
    				is_local: false,
    				name: "Orange Spider",
    				preview_url: "https://p.scdn.co/mp3-preview/375370eabffb6962e21b195a01c9324c0078eec8?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:5vxsFNGBtAYzrYpNzadPkj"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 201560,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6Wvx6aVDbtMs2OSHKWqEOe"
    				},
    				href: "https://api.spotify.com/v1/tracks/6Wvx6aVDbtMs2OSHKWqEOe",
    				id: "6Wvx6aVDbtMs2OSHKWqEOe",
    				is_local: false,
    				name: "C-Minor",
    				preview_url: "https://p.scdn.co/mp3-preview/7d649f9b0bb19d75801f3d3b29b43e773d6af63f?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:6Wvx6aVDbtMs2OSHKWqEOe"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 267133,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3NmKtmTJJXniwNRaMLNeJF"
    				},
    				href: "https://api.spotify.com/v1/tracks/3NmKtmTJJXniwNRaMLNeJF",
    				id: "3NmKtmTJJXniwNRaMLNeJF",
    				is_local: false,
    				name: "In A Market Dimly Lit",
    				preview_url: "https://p.scdn.co/mp3-preview/351805ba560fe4124898204ddac0c65339a59ad2?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:3NmKtmTJJXniwNRaMLNeJF"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 271106,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3dt4NA5j9f0BTymudtLVK9"
    				},
    				href: "https://api.spotify.com/v1/tracks/3dt4NA5j9f0BTymudtLVK9",
    				id: "3dt4NA5j9f0BTymudtLVK9",
    				is_local: false,
    				name: "O, Porcupine",
    				preview_url: "https://p.scdn.co/mp3-preview/1efdd7624e1fad0660a531c5f7267648f0d45844?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:3dt4NA5j9f0BTymudtLVK9"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 79826,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6xu7a7tJGiFFZB7PmIB0j3"
    				},
    				href: "https://api.spotify.com/v1/tracks/6xu7a7tJGiFFZB7PmIB0j3",
    				id: "6xu7a7tJGiFFZB7PmIB0j3",
    				is_local: false,
    				name: "Brownish Spider",
    				preview_url: "https://p.scdn.co/mp3-preview/20b009027b458246858c2d39cce71f1359a13410?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 12,
    				type: "track",
    				uri: "spotify:track:6xu7a7tJGiFFZB7PmIB0j3"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 326066,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2v4kQsvlTPEYOIyJkytzGH"
    				},
    				href: "https://api.spotify.com/v1/tracks/2v4kQsvlTPEYOIyJkytzGH",
    				id: "2v4kQsvlTPEYOIyJkytzGH",
    				is_local: false,
    				name: "In A Sweater Poorly Knit",
    				preview_url: "https://p.scdn.co/mp3-preview/1bb9f2b5121f33a53aa9ec23a8bf1215326290a9?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 13,
    				type: "track",
    				uri: "spotify:track:2v4kQsvlTPEYOIyJkytzGH"
    			}
    		]
    	},
    	{
    		name: "It's All Crazy! It's All False! It's All A Dream! It's Alright",
    		release_date: "2009-01-01",
    		id: "1NAKevr9Io1J3isYJFtUiH",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 211426,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0iCmSNHh2SaJPa6G3Mx105"
    				},
    				href: "https://api.spotify.com/v1/tracks/0iCmSNHh2SaJPa6G3Mx105",
    				id: "0iCmSNHh2SaJPa6G3Mx105",
    				is_local: false,
    				name: "Every Thought A Thought Of You",
    				preview_url: "https://p.scdn.co/mp3-preview/ba74bbbbbe906f8f6eb6a21584cdbafa20dab7d5?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:0iCmSNHh2SaJPa6G3Mx105"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 210906,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4SenxwCmSCIXfklUvmXyNc"
    				},
    				href: "https://api.spotify.com/v1/tracks/4SenxwCmSCIXfklUvmXyNc",
    				id: "4SenxwCmSCIXfklUvmXyNc",
    				is_local: false,
    				name: "The Fox, The Crow And The Cookie",
    				preview_url: "https://p.scdn.co/mp3-preview/1b7eaf4e2248fdae9993837c17e565382c8d1bdf?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:4SenxwCmSCIXfklUvmXyNc"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 233639,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2RUy5I1dQMeC39LCS21l0k"
    				},
    				href: "https://api.spotify.com/v1/tracks/2RUy5I1dQMeC39LCS21l0k",
    				id: "2RUy5I1dQMeC39LCS21l0k",
    				is_local: false,
    				name: "The Angel Of Death Came To David's Room",
    				preview_url: "https://p.scdn.co/mp3-preview/aae46fe17a7e7f2ea2454cc8972db38fd04c4918?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:2RUy5I1dQMeC39LCS21l0k"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 229826,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2wdCMe9PlDAk0cXzJN8ouf"
    				},
    				href: "https://api.spotify.com/v1/tracks/2wdCMe9PlDAk0cXzJN8ouf",
    				id: "2wdCMe9PlDAk0cXzJN8ouf",
    				is_local: false,
    				name: "Goodbye, I!",
    				preview_url: "https://p.scdn.co/mp3-preview/a57bcf70c336f3eb1c5c7792966f46b8c0da0686?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:2wdCMe9PlDAk0cXzJN8ouf"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 186466,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/66bBqOh9aIXfkoTF19yNNP"
    				},
    				href: "https://api.spotify.com/v1/tracks/66bBqOh9aIXfkoTF19yNNP",
    				id: "66bBqOh9aIXfkoTF19yNNP",
    				is_local: false,
    				name: "A Stick, A Carrot & String",
    				preview_url: "https://p.scdn.co/mp3-preview/d771865dc386960680f7af70757ceb623d79c429?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:66bBqOh9aIXfkoTF19yNNP"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 312400,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3zKtiuUwiTXqZxgzaeGfWT"
    				},
    				href: "https://api.spotify.com/v1/tracks/3zKtiuUwiTXqZxgzaeGfWT",
    				id: "3zKtiuUwiTXqZxgzaeGfWT",
    				is_local: false,
    				name: "Bullet To Binary (Pt. Two)",
    				preview_url: "https://p.scdn.co/mp3-preview/c1219a9d9fb227588888009dcfc3b5fa958dae5e?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:3zKtiuUwiTXqZxgzaeGfWT"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 217373,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3g5oasTR2LJdmcHe2y4IGh"
    				},
    				href: "https://api.spotify.com/v1/tracks/3g5oasTR2LJdmcHe2y4IGh",
    				id: "3g5oasTR2LJdmcHe2y4IGh",
    				is_local: false,
    				name: "Timothy Hay",
    				preview_url: "https://p.scdn.co/mp3-preview/95d25300945d4e3e267d73544dc54f2a16037cdc?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:3g5oasTR2LJdmcHe2y4IGh"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 210733,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6uWY4C9uzGEqVVRpHIag2y"
    				},
    				href: "https://api.spotify.com/v1/tracks/6uWY4C9uzGEqVVRpHIag2y",
    				id: "6uWY4C9uzGEqVVRpHIag2y",
    				is_local: false,
    				name: "Fig With A Bellyache",
    				preview_url: "https://p.scdn.co/mp3-preview/a3cc4f3d3358ae9f29fb1472defe631330fb3e51?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:6uWY4C9uzGEqVVRpHIag2y"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 226826,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5EzhWgCSM4aLlzZNicCT0E"
    				},
    				href: "https://api.spotify.com/v1/tracks/5EzhWgCSM4aLlzZNicCT0E",
    				id: "5EzhWgCSM4aLlzZNicCT0E",
    				is_local: false,
    				name: "Cattail Down",
    				preview_url: "https://p.scdn.co/mp3-preview/85c8bb2641a6c2c76ab950f3641f25e1ca48ec8d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:5EzhWgCSM4aLlzZNicCT0E"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 361133,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4IDOe60g0rR3hQqpAluLgN"
    				},
    				href: "https://api.spotify.com/v1/tracks/4IDOe60g0rR3hQqpAluLgN",
    				id: "4IDOe60g0rR3hQqpAluLgN",
    				is_local: false,
    				name: "The King Beetle On A Coconut Estate",
    				preview_url: "https://p.scdn.co/mp3-preview/5bcdf9e9fb31c061ca52b1e4be73444e96a6dbeb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:4IDOe60g0rR3hQqpAluLgN"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 294666,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4hgOurZoqPZlkiNz68KXUk"
    				},
    				href: "https://api.spotify.com/v1/tracks/4hgOurZoqPZlkiNz68KXUk",
    				id: "4hgOurZoqPZlkiNz68KXUk",
    				is_local: false,
    				name: "Allah, Allah, Allah",
    				preview_url: "https://p.scdn.co/mp3-preview/fb5b1a7f14a0278e27e394353270223153f9fa1c?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:4hgOurZoqPZlkiNz68KXUk"
    			}
    		]
    	},
    	{
    		name: "Ten Stories",
    		release_date: "2012-05-15",
    		id: "5yUuvNNfp543G4ZBW6339m",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 226346,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4ruI4iAHuYyWjoK6xsEEDY"
    				},
    				href: "https://api.spotify.com/v1/tracks/4ruI4iAHuYyWjoK6xsEEDY",
    				id: "4ruI4iAHuYyWjoK6xsEEDY",
    				is_local: false,
    				name: "February, 1878",
    				preview_url: "https://p.scdn.co/mp3-preview/2e413f8f35abe41d9936f6ebf520d1e7cc654293?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:4ruI4iAHuYyWjoK6xsEEDY"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 197853,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6llyCgHfLeNjtB87HusLKm"
    				},
    				href: "https://api.spotify.com/v1/tracks/6llyCgHfLeNjtB87HusLKm",
    				id: "6llyCgHfLeNjtB87HusLKm",
    				is_local: false,
    				name: "Grist for the Malady Mill",
    				preview_url: "https://p.scdn.co/mp3-preview/a82884d6686f5c5233b4e1e756e17519ae0bf9bb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:6llyCgHfLeNjtB87HusLKm"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 172186,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0R446KpP1YkXcEXNVvYeOz"
    				},
    				href: "https://api.spotify.com/v1/tracks/0R446KpP1YkXcEXNVvYeOz",
    				id: "0R446KpP1YkXcEXNVvYeOz",
    				is_local: false,
    				name: "East Enders Wives",
    				preview_url: "https://p.scdn.co/mp3-preview/bcd2b88622f7df813e3fb491dd68a2a29523bbdb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:0R446KpP1YkXcEXNVvYeOz"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 223853,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/57sP3t711PsLTbwpo508sf"
    				},
    				href: "https://api.spotify.com/v1/tracks/57sP3t711PsLTbwpo508sf",
    				id: "57sP3t711PsLTbwpo508sf",
    				is_local: false,
    				name: "Cardiff Giant",
    				preview_url: "https://p.scdn.co/mp3-preview/151ec0e5a5da259c55875643220d6522a6433da3?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:57sP3t711PsLTbwpo508sf"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 231413,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0BLRwwvl7XEeRYGMgANvbv"
    				},
    				href: "https://api.spotify.com/v1/tracks/0BLRwwvl7XEeRYGMgANvbv",
    				id: "0BLRwwvl7XEeRYGMgANvbv",
    				is_local: false,
    				name: "Elephant in the Dock",
    				preview_url: "https://p.scdn.co/mp3-preview/c52c6ffe137400178a70daf9e694839262607919?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:0BLRwwvl7XEeRYGMgANvbv"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 194293,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/390OTX74s15KU8eylnidI8"
    				},
    				href: "https://api.spotify.com/v1/tracks/390OTX74s15KU8eylnidI8",
    				id: "390OTX74s15KU8eylnidI8",
    				is_local: false,
    				name: "Aubergine",
    				preview_url: "https://p.scdn.co/mp3-preview/a54103a7635ccb052ac35d95a072602df86a3a1f?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:390OTX74s15KU8eylnidI8"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 224613,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/01IcPlz4hoK6x3f3uyqRUc"
    				},
    				href: "https://api.spotify.com/v1/tracks/01IcPlz4hoK6x3f3uyqRUc",
    				id: "01IcPlz4hoK6x3f3uyqRUc",
    				is_local: false,
    				name: "Fox's Dream of the Log Flume",
    				preview_url: "https://p.scdn.co/mp3-preview/3a190a0e3a5b9210b0610e3fb5ce78f819437c52?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:01IcPlz4hoK6x3f3uyqRUc"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 286506,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7y1VjaXeSjDIWaKTZfbyMn"
    				},
    				href: "https://api.spotify.com/v1/tracks/7y1VjaXeSjDIWaKTZfbyMn",
    				id: "7y1VjaXeSjDIWaKTZfbyMn",
    				is_local: false,
    				name: "Nine Stories",
    				preview_url: "https://p.scdn.co/mp3-preview/789c977d94e788690aa7aaa22a2788137884f4da?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:7y1VjaXeSjDIWaKTZfbyMn"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 214480,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0doHpAsLU9OBlON4OXIDB4"
    				},
    				href: "https://api.spotify.com/v1/tracks/0doHpAsLU9OBlON4OXIDB4",
    				id: "0doHpAsLU9OBlON4OXIDB4",
    				is_local: false,
    				name: "Fiji Mermaid",
    				preview_url: "https://p.scdn.co/mp3-preview/6eeeb55e02d789070bebdc256e72c9a43d3bc5a9?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:0doHpAsLU9OBlON4OXIDB4"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 299586,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5M2y5N7lzSidmpQoljlyjQ"
    				},
    				href: "https://api.spotify.com/v1/tracks/5M2y5N7lzSidmpQoljlyjQ",
    				id: "5M2y5N7lzSidmpQoljlyjQ",
    				is_local: false,
    				name: "Bear's Vision of St. Agnes",
    				preview_url: "https://p.scdn.co/mp3-preview/a804f21c97facee6a5b7514c7fb7028e02ffbb7d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:5M2y5N7lzSidmpQoljlyjQ"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 164040,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2xykDv0N9V8OCDnqw3qO0n"
    				},
    				href: "https://api.spotify.com/v1/tracks/2xykDv0N9V8OCDnqw3qO0n",
    				id: "2xykDv0N9V8OCDnqw3qO0n",
    				is_local: false,
    				name: "All Circles",
    				preview_url: "https://p.scdn.co/mp3-preview/7563c35ba5904c1394a8d27bea6510b3ea08de40?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:2xykDv0N9V8OCDnqw3qO0n"
    			}
    		]
    	},
    	{
    		name: "A To B Life",
    		release_date: "2002-01-01",
    		id: "2rErxidCuRG9OAFv2WPMKA",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 167560,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/24gpcyxzfyE8DI89FXFHLh"
    				},
    				href: "https://api.spotify.com/v1/tracks/24gpcyxzfyE8DI89FXFHLh",
    				id: "24gpcyxzfyE8DI89FXFHLh",
    				is_local: false,
    				name: "Bullet To Binary",
    				preview_url: "https://p.scdn.co/mp3-preview/14d45964432c4de894473a2d431b192013bb91a0?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:24gpcyxzfyE8DI89FXFHLh"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 193515,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7nlOH6p5uvkqMpTFwKijiU"
    				},
    				href: "https://api.spotify.com/v1/tracks/7nlOH6p5uvkqMpTFwKijiU",
    				id: "7nlOH6p5uvkqMpTFwKijiU",
    				is_local: false,
    				name: "The Ghost",
    				preview_url: "https://p.scdn.co/mp3-preview/f4ed8ad0daf613fa5c1af8643d74078789d8fc85?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:7nlOH6p5uvkqMpTFwKijiU"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 234289,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1QCTjAvCWYD91Jg2JnkIXs"
    				},
    				href: "https://api.spotify.com/v1/tracks/1QCTjAvCWYD91Jg2JnkIXs",
    				id: "1QCTjAvCWYD91Jg2JnkIXs",
    				is_local: false,
    				name: "Nice And Blue",
    				preview_url: "https://p.scdn.co/mp3-preview/b5448d82e3ae99ff7d71705e944c52ddee24ded3?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:1QCTjAvCWYD91Jg2JnkIXs"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 284693,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2fvdaoCeCkqQlZ4UINdtbY"
    				},
    				href: "https://api.spotify.com/v1/tracks/2fvdaoCeCkqQlZ4UINdtbY",
    				id: "2fvdaoCeCkqQlZ4UINdtbY",
    				is_local: false,
    				name: "Everything Was Beautiful And Nothing Hurt",
    				preview_url: "https://p.scdn.co/mp3-preview/815c871e299c6bd54c96f514f6d2f922f359b069?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:2fvdaoCeCkqQlZ4UINdtbY"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 54040,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2RVF2aOjQDVEdIEtlGxdV6"
    				},
    				href: "https://api.spotify.com/v1/tracks/2RVF2aOjQDVEdIEtlGxdV6",
    				id: "2RVF2aOjQDVEdIEtlGxdV6",
    				is_local: false,
    				name: "(A)",
    				preview_url: "https://p.scdn.co/mp3-preview/fc1bc4524616b30c0e4d68f30c793f8442d74f0a?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:2RVF2aOjQDVEdIEtlGxdV6"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 169691,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/64kXVr5DPVlHaTHmzctWej"
    				},
    				href: "https://api.spotify.com/v1/tracks/64kXVr5DPVlHaTHmzctWej",
    				id: "64kXVr5DPVlHaTHmzctWej",
    				is_local: false,
    				name: "Gentleman",
    				preview_url: "https://p.scdn.co/mp3-preview/32a9eb4da693cec288703f34737241f4c6ba2723?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:64kXVr5DPVlHaTHmzctWej"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 161786,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3R7aTV4MlBdFninNq8DnwJ"
    				},
    				href: "https://api.spotify.com/v1/tracks/3R7aTV4MlBdFninNq8DnwJ",
    				id: "3R7aTV4MlBdFninNq8DnwJ",
    				is_local: false,
    				name: "Be Still, Child",
    				preview_url: "https://p.scdn.co/mp3-preview/feb186762214bfa097ac51235689418771a58cf1?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:3R7aTV4MlBdFninNq8DnwJ"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 178586,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5G4t54Eh5TKBpx2dfshppr"
    				},
    				href: "https://api.spotify.com/v1/tracks/5G4t54Eh5TKBpx2dfshppr",
    				id: "5G4t54Eh5TKBpx2dfshppr",
    				is_local: false,
    				name: "We Know Who Our Enemies Are",
    				preview_url: "https://p.scdn.co/mp3-preview/a70a68671ca857d73bf17c095575ecdaaa29baba?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:5G4t54Eh5TKBpx2dfshppr"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 181160,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7B8zM66sSodq5ZXI18KQbw"
    				},
    				href: "https://api.spotify.com/v1/tracks/7B8zM66sSodq5ZXI18KQbw",
    				id: "7B8zM66sSodq5ZXI18KQbw",
    				is_local: false,
    				name: "I Never Said That I Was Brave",
    				preview_url: "https://p.scdn.co/mp3-preview/7926a201df780a9bfb07ae7e044b475dac3754f2?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:7B8zM66sSodq5ZXI18KQbw"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 94413,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6p0QVehoEqA1zHxZQLEY1w"
    				},
    				href: "https://api.spotify.com/v1/tracks/6p0QVehoEqA1zHxZQLEY1w",
    				id: "6p0QVehoEqA1zHxZQLEY1w",
    				is_local: false,
    				name: "(B)",
    				preview_url: "https://p.scdn.co/mp3-preview/1c67f7b2d2e299e6b98e4c96fb1aa45571fd86b3?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:6p0QVehoEqA1zHxZQLEY1w"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 229320,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1NiWBAj8P15s9D3lJdBQaS"
    				},
    				href: "https://api.spotify.com/v1/tracks/1NiWBAj8P15s9D3lJdBQaS",
    				id: "1NiWBAj8P15s9D3lJdBQaS",
    				is_local: false,
    				name: "Silencer",
    				preview_url: "https://p.scdn.co/mp3-preview/269648caebda49ce51982a2d0e4d7934a3765851?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:1NiWBAj8P15s9D3lJdBQaS"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 908840,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7xPH42ceyKfo0wndp70DyS"
    				},
    				href: "https://api.spotify.com/v1/tracks/7xPH42ceyKfo0wndp70DyS",
    				id: "7xPH42ceyKfo0wndp70DyS",
    				is_local: false,
    				name: "The Cure For Pain",
    				preview_url: "https://p.scdn.co/mp3-preview/bf695d55e57e125d715fc26485dad1648cbf5208?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 12,
    				type: "track",
    				uri: "spotify:track:7xPH42ceyKfo0wndp70DyS"
    			}
    		]
    	},
    	{
    		name: "I Never Said That I Was Brave",
    		release_date: "2001-03-17",
    		id: "1z2albOOr3jSECeTcCwFpS",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 177747,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2FRah7NErK6gO27cqygGJ1"
    				},
    				href: "https://api.spotify.com/v1/tracks/2FRah7NErK6gO27cqygGJ1",
    				id: "2FRah7NErK6gO27cqygGJ1",
    				is_local: false,
    				name: "I Never Said That I Was Brave",
    				preview_url: "https://p.scdn.co/mp3-preview/0f62b356463dd36fa12db793e031f3a58323a730?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:2FRah7NErK6gO27cqygGJ1"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 174407,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1aTxWra99EJJitoUSvfqA8"
    				},
    				href: "https://api.spotify.com/v1/tracks/1aTxWra99EJJitoUSvfqA8",
    				id: "1aTxWra99EJJitoUSvfqA8",
    				is_local: false,
    				name: "Flamethrower",
    				preview_url: "https://p.scdn.co/mp3-preview/a7f4bb6fa1735664ba079f4acf31a4906a9dbe46?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:1aTxWra99EJJitoUSvfqA8"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 149446,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0ibwNwizkwac95jTi5PFGI"
    				},
    				href: "https://api.spotify.com/v1/tracks/0ibwNwizkwac95jTi5PFGI",
    				id: "0ibwNwizkwac95jTi5PFGI",
    				is_local: false,
    				name: "Dying Is Strange and Hard",
    				preview_url: "https://p.scdn.co/mp3-preview/738289db4a3b4d26d707651ca1bd09f2082600d2?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:0ibwNwizkwac95jTi5PFGI"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 166504,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7zYVh2r4wUCHHtA2fjRwho"
    				},
    				href: "https://api.spotify.com/v1/tracks/7zYVh2r4wUCHHtA2fjRwho",
    				id: "7zYVh2r4wUCHHtA2fjRwho",
    				is_local: false,
    				name: "We Know Who Our Enemies Are",
    				preview_url: "https://p.scdn.co/mp3-preview/955fe5f61564f0d2977bd1280d198ddaa2bbc233?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:7zYVh2r4wUCHHtA2fjRwho"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 184894,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6rV6c9SkfMr12n6wVhKFRO"
    				},
    				href: "https://api.spotify.com/v1/tracks/6rV6c9SkfMr12n6wVhKFRO",
    				id: "6rV6c9SkfMr12n6wVhKFRO",
    				is_local: false,
    				name: "Four Word Letter",
    				preview_url: "https://p.scdn.co/mp3-preview/f89a5ae5c578752d45772e258299c47878379fca?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:6rV6c9SkfMr12n6wVhKFRO"
    			}
    		]
    	},
    	{
    		name: "[Untitled]",
    		release_date: "2018-10-05",
    		id: "0wFPFHvi467fdOlBKTVJRY",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 141825,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2JsQHMl5Wqcy6Likcf9mmh"
    				},
    				href: "https://api.spotify.com/v1/tracks/2JsQHMl5Wqcy6Likcf9mmh",
    				id: "2JsQHMl5Wqcy6Likcf9mmh",
    				is_local: false,
    				name: "9:27a.m., 7/29",
    				preview_url: "https://p.scdn.co/mp3-preview/769e9fab3336e65531c1f2915e3d6e6ade0ef294?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:2JsQHMl5Wqcy6Likcf9mmh"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 237462,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2ppb1P4Ca7mFUay8seG0V2"
    				},
    				href: "https://api.spotify.com/v1/tracks/2ppb1P4Ca7mFUay8seG0V2",
    				id: "2ppb1P4Ca7mFUay8seG0V2",
    				is_local: false,
    				name: "Julia (or, ‘Holy to the LORD’ on the Bells of Horses)",
    				preview_url: "https://p.scdn.co/mp3-preview/4abcb9a396903809fb5ad7dc542c9333fa364dcb?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:2ppb1P4Ca7mFUay8seG0V2"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 163268,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3PMsfT4LWqfDZt9RciF4di"
    				},
    				href: "https://api.spotify.com/v1/tracks/3PMsfT4LWqfDZt9RciF4di",
    				id: "3PMsfT4LWqfDZt9RciF4di",
    				is_local: false,
    				name: "Another Head for Hydra",
    				preview_url: "https://p.scdn.co/mp3-preview/a0b3e26bf35307fcf006fce5b84bc768a6f77239?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:3PMsfT4LWqfDZt9RciF4di"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 254397,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5yAbKy66DsJ5GVAz7OGUbB"
    				},
    				href: "https://api.spotify.com/v1/tracks/5yAbKy66DsJ5GVAz7OGUbB",
    				id: "5yAbKy66DsJ5GVAz7OGUbB",
    				is_local: false,
    				name: "[dormouse sighs]",
    				preview_url: "https://p.scdn.co/mp3-preview/7af6f5859caede521c3f7be39368c3e61867d452?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:5yAbKy66DsJ5GVAz7OGUbB"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 232606,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4VL7Cbm6rHKwzscq4OIuSy"
    				},
    				href: "https://api.spotify.com/v1/tracks/4VL7Cbm6rHKwzscq4OIuSy",
    				id: "4VL7Cbm6rHKwzscq4OIuSy",
    				is_local: false,
    				name: "Winter Solstice",
    				preview_url: "https://p.scdn.co/mp3-preview/27637bd1a0a5a451e4152ea1f39b6008a049f5d0?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:4VL7Cbm6rHKwzscq4OIuSy"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 297946,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3EpbTPo0q1tKPOt7h92JLW"
    				},
    				href: "https://api.spotify.com/v1/tracks/3EpbTPo0q1tKPOt7h92JLW",
    				id: "3EpbTPo0q1tKPOt7h92JLW",
    				is_local: false,
    				name: "Flee, Thou Matadors!",
    				preview_url: "https://p.scdn.co/mp3-preview/6c7816654dff71454236771262f4ab352910a9d8?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:3EpbTPo0q1tKPOt7h92JLW"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 273539,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6RZLGygHz4Qdxcj2Br3JY5"
    				},
    				href: "https://api.spotify.com/v1/tracks/6RZLGygHz4Qdxcj2Br3JY5",
    				id: "6RZLGygHz4Qdxcj2Br3JY5",
    				is_local: false,
    				name: "Tortoises All the Way Down",
    				preview_url: "https://p.scdn.co/mp3-preview/273b5ea53de8eca2129813581c496b46e55d3c15?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:6RZLGygHz4Qdxcj2Br3JY5"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 146044,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0Zszl40tff7RJrH87kFlGo"
    				},
    				href: "https://api.spotify.com/v1/tracks/0Zszl40tff7RJrH87kFlGo",
    				id: "0Zszl40tff7RJrH87kFlGo",
    				is_local: false,
    				name: "2,459 Miles",
    				preview_url: "https://p.scdn.co/mp3-preview/f5737040bd1734782580daffa481a37fc8e3f9a6?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:0Zszl40tff7RJrH87kFlGo"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 131781,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/36dKX97oU20VupPOszAeMk"
    				},
    				href: "https://api.spotify.com/v1/tracks/36dKX97oU20VupPOszAeMk",
    				id: "36dKX97oU20VupPOszAeMk",
    				is_local: false,
    				name: "Wendy & Betsy",
    				preview_url: "https://p.scdn.co/mp3-preview/d759fe6d4e83792bdcd3b27b51d30bcb97b2af86?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:36dKX97oU20VupPOszAeMk"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 284236,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/00Yl1cQEXBTbBSJtDnHAkT"
    				},
    				href: "https://api.spotify.com/v1/tracks/00Yl1cQEXBTbBSJtDnHAkT",
    				id: "00Yl1cQEXBTbBSJtDnHAkT",
    				is_local: false,
    				name: "New Wine, New Skins",
    				preview_url: "https://p.scdn.co/mp3-preview/e739b1dee2f3ac4c14b351a307942edf32fbebe8?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:00Yl1cQEXBTbBSJtDnHAkT"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 312912,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3ISF49ak8N7dvqZF7p4Hp2"
    				},
    				href: "https://api.spotify.com/v1/tracks/3ISF49ak8N7dvqZF7p4Hp2",
    				id: "3ISF49ak8N7dvqZF7p4Hp2",
    				is_local: false,
    				name: "Michael, Row Your Boat Ashore",
    				preview_url: "https://p.scdn.co/mp3-preview/f2ce170056c08a751c5bf87f2c1d04a2d18be260?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:3ISF49ak8N7dvqZF7p4Hp2"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AZ",
    					"BB",
    					"BD",
    					"BF",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"DJ",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EG",
    					"FJ",
    					"FM",
    					"GA",
    					"GD",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"ID",
    					"IL",
    					"IN",
    					"IQ",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LK",
    					"LR",
    					"LS",
    					"LY",
    					"MA",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NP",
    					"NR",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PS",
    					"PW",
    					"PY",
    					"QA",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SG",
    					"SL",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 114640,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7mKsZbHxnBq1KavWYWQ0JY"
    				},
    				href: "https://api.spotify.com/v1/tracks/7mKsZbHxnBq1KavWYWQ0JY",
    				id: "7mKsZbHxnBq1KavWYWQ0JY",
    				is_local: false,
    				name: "Break on Through (to the Other Side) [pt. Two]",
    				preview_url: "https://p.scdn.co/mp3-preview/6786c1695c45d14aa2a6c1e2af4d132c885d57ca?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 12,
    				type: "track",
    				uri: "spotify:track:7mKsZbHxnBq1KavWYWQ0JY"
    			}
    		]
    	},
    	{
    		name: "Catch For Us The Foxes",
    		release_date: "2004-01-01",
    		id: "5mlCtfr6NLphHzAaXIuXz4",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 227453,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6FciQamZ49aqlmn06yJjYx"
    				},
    				href: "https://api.spotify.com/v1/tracks/6FciQamZ49aqlmn06yJjYx",
    				id: "6FciQamZ49aqlmn06yJjYx",
    				is_local: false,
    				name: "Torches Together",
    				preview_url: "https://p.scdn.co/mp3-preview/7ab55c1ba13d1c18c3a7b36a12c6162116166e5d?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:6FciQamZ49aqlmn06yJjYx"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 206440,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0BMzC3hYff1zj2MsllexiU"
    				},
    				href: "https://api.spotify.com/v1/tracks/0BMzC3hYff1zj2MsllexiU",
    				id: "0BMzC3hYff1zj2MsllexiU",
    				is_local: false,
    				name: "January 1979",
    				preview_url: "https://p.scdn.co/mp3-preview/e01e6d76097bc107c6231de4bab6f21f89ddaf92?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:0BMzC3hYff1zj2MsllexiU"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 221040,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3VduoRGZdym3rpyyQp7kYD"
    				},
    				href: "https://api.spotify.com/v1/tracks/3VduoRGZdym3rpyyQp7kYD",
    				id: "3VduoRGZdym3rpyyQp7kYD",
    				is_local: false,
    				name: "Tie Me Up! Untie Me!",
    				preview_url: "https://p.scdn.co/mp3-preview/324afeff692cf8a1a62cbd4220063210752c3d7e?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:3VduoRGZdym3rpyyQp7kYD"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 217506,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1kVAfLWNc98gw5phIK1uxt"
    				},
    				href: "https://api.spotify.com/v1/tracks/1kVAfLWNc98gw5phIK1uxt",
    				id: "1kVAfLWNc98gw5phIK1uxt",
    				is_local: false,
    				name: "Leaf",
    				preview_url: "https://p.scdn.co/mp3-preview/1d1459e9885b07a35a4da94dd83ed44d17c26c84?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:1kVAfLWNc98gw5phIK1uxt"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 178973,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3P0atuOYOpbU9KkeW94F4X"
    				},
    				href: "https://api.spotify.com/v1/tracks/3P0atuOYOpbU9KkeW94F4X",
    				id: "3P0atuOYOpbU9KkeW94F4X",
    				is_local: false,
    				name: "Disaster Tourism",
    				preview_url: "https://p.scdn.co/mp3-preview/fcb46b13cd67c59c9ab63e8ea32644052db267a9?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:3P0atuOYOpbU9KkeW94F4X"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 228466,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5oVm1WBfT6NQwO90TnL0uk"
    				},
    				href: "https://api.spotify.com/v1/tracks/5oVm1WBfT6NQwO90TnL0uk",
    				id: "5oVm1WBfT6NQwO90TnL0uk",
    				is_local: false,
    				name: "Seven Sisters",
    				preview_url: "https://p.scdn.co/mp3-preview/e25ace705353e4ffbd663d5354ac407b76511c9e?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:5oVm1WBfT6NQwO90TnL0uk"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 183040,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/0D6m2y5QwQ3kUWrVT2wixO"
    				},
    				href: "https://api.spotify.com/v1/tracks/0D6m2y5QwQ3kUWrVT2wixO",
    				id: "0D6m2y5QwQ3kUWrVT2wixO",
    				is_local: false,
    				name: "The Soviet",
    				preview_url: "https://p.scdn.co/mp3-preview/4e4874ca7e9f869c882684f5b76f65d15be988ba?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:0D6m2y5QwQ3kUWrVT2wixO"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 252080,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2i6ryQK1G1MujGFHw7D9aT"
    				},
    				href: "https://api.spotify.com/v1/tracks/2i6ryQK1G1MujGFHw7D9aT",
    				id: "2i6ryQK1G1MujGFHw7D9aT",
    				is_local: false,
    				name: "Paper-Hanger",
    				preview_url: "https://p.scdn.co/mp3-preview/62953c38e29c25e7a35d3b354f43264da4d6b15b?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:2i6ryQK1G1MujGFHw7D9aT"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 232803,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3nJ21VQa5ECy70Iqy6pB3J"
    				},
    				href: "https://api.spotify.com/v1/tracks/3nJ21VQa5ECy70Iqy6pB3J",
    				id: "3nJ21VQa5ECy70Iqy6pB3J",
    				is_local: false,
    				name: "My Exit, Unfair",
    				preview_url: "https://p.scdn.co/mp3-preview/a6f11362e7ad2ac42e1a3711e8d95f9ef5c8717e?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 9,
    				type: "track",
    				uri: "spotify:track:3nJ21VQa5ECy70Iqy6pB3J"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 262226,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/5lkMaVEy2gun1vDKnd46D4"
    				},
    				href: "https://api.spotify.com/v1/tracks/5lkMaVEy2gun1vDKnd46D4",
    				id: "5lkMaVEy2gun1vDKnd46D4",
    				is_local: false,
    				name: "Four Word Letter",
    				preview_url: "https://p.scdn.co/mp3-preview/b2b7f760bfcf73a0dde41be4a67610d286f12220?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 10,
    				type: "track",
    				uri: "spotify:track:5lkMaVEy2gun1vDKnd46D4"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 341493,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3ByXdZL89WHa9h5fpkd9qs"
    				},
    				href: "https://api.spotify.com/v1/tracks/3ByXdZL89WHa9h5fpkd9qs",
    				id: "3ByXdZL89WHa9h5fpkd9qs",
    				is_local: false,
    				name: "Carousels",
    				preview_url: "https://p.scdn.co/mp3-preview/46c9ef974270386ca0ae73d578dea0186bdf1445?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 11,
    				type: "track",
    				uri: "spotify:track:3ByXdZL89WHa9h5fpkd9qs"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AL",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BA",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BY",
    					"BZ",
    					"CA",
    					"CD",
    					"CG",
    					"CH",
    					"CI",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HR",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IQ",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LR",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"LY",
    					"MA",
    					"MC",
    					"MD",
    					"ME",
    					"MG",
    					"MH",
    					"MK",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RS",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"XK",
    					"ZA",
    					"ZM",
    					"ZW"
    				],
    				disc_number: 1,
    				duration_ms: 207573,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6vjiNNOIO1DMAgF81FuwBF"
    				},
    				href: "https://api.spotify.com/v1/tracks/6vjiNNOIO1DMAgF81FuwBF",
    				id: "6vjiNNOIO1DMAgF81FuwBF",
    				is_local: false,
    				name: "Son Of A Widow",
    				preview_url: "https://p.scdn.co/mp3-preview/ead2d29b565133e3eef248e476fa2c62681fe753?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 12,
    				type: "track",
    				uri: "spotify:track:6vjiNNOIO1DMAgF81FuwBF"
    			}
    		]
    	},
    	{
    		name: "Pale Horses: Appendix",
    		release_date: "2016-06-24",
    		id: "2MTXMfsOkslZlj0fQgnRw3",
    		tracks: [
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 118955,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/3UMaLStotWuLIrw4WsDJZN"
    				},
    				href: "https://api.spotify.com/v1/tracks/3UMaLStotWuLIrw4WsDJZN",
    				id: "3UMaLStotWuLIrw4WsDJZN",
    				is_local: false,
    				name: "Hebrew Children",
    				preview_url: "https://p.scdn.co/mp3-preview/6f2fce18ef8a243b584336654aa0995f62c15ba0?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 1,
    				type: "track",
    				uri: "spotify:track:3UMaLStotWuLIrw4WsDJZN"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 199041,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/2VR94RlOkO4wdM8CdOHyS0"
    				},
    				href: "https://api.spotify.com/v1/tracks/2VR94RlOkO4wdM8CdOHyS0",
    				id: "2VR94RlOkO4wdM8CdOHyS0",
    				is_local: false,
    				name: "Werewolf King (Demo)",
    				preview_url: "https://p.scdn.co/mp3-preview/e037aecc462bf42800685729abaff56b9a40df79?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 2,
    				type: "track",
    				uri: "spotify:track:2VR94RlOkO4wdM8CdOHyS0"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 177683,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/7L3R0cjsUo7EEWQgaFrMRk"
    				},
    				href: "https://api.spotify.com/v1/tracks/7L3R0cjsUo7EEWQgaFrMRk",
    				id: "7L3R0cjsUo7EEWQgaFrMRk",
    				is_local: false,
    				name: "Chapelcross Towns",
    				preview_url: "https://p.scdn.co/mp3-preview/7532eee246e92fb3145b63f12c9428dc8c35b590?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 3,
    				type: "track",
    				uri: "spotify:track:7L3R0cjsUo7EEWQgaFrMRk"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 261052,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1y5kBvy1LA6Wt3GVwKVT1T"
    				},
    				href: "https://api.spotify.com/v1/tracks/1y5kBvy1LA6Wt3GVwKVT1T",
    				id: "1y5kBvy1LA6Wt3GVwKVT1T",
    				is_local: false,
    				name: "Chernobyl, 1985",
    				preview_url: "https://p.scdn.co/mp3-preview/add3e373ca27dad6d8cf40360aaf13dd1f31c505?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 4,
    				type: "track",
    				uri: "spotify:track:1y5kBvy1LA6Wt3GVwKVT1T"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 213799,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/76R8pwTUUqdcg7mYf7siqx"
    				},
    				href: "https://api.spotify.com/v1/tracks/76R8pwTUUqdcg7mYf7siqx",
    				id: "76R8pwTUUqdcg7mYf7siqx",
    				is_local: false,
    				name: "Mexican War Streets (Revisited)",
    				preview_url: "https://p.scdn.co/mp3-preview/cd0763cce27154becfdc3c642927d75207fae2a4?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 5,
    				type: "track",
    				uri: "spotify:track:76R8pwTUUqdcg7mYf7siqx"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 192174,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/6re2Ni4dXwh8yHddoY9IW2"
    				},
    				href: "https://api.spotify.com/v1/tracks/6re2Ni4dXwh8yHddoY9IW2",
    				id: "6re2Ni4dXwh8yHddoY9IW2",
    				is_local: false,
    				name: "Blue Hen (Geology Version)",
    				preview_url: "https://p.scdn.co/mp3-preview/cf7ca1eb66bbd1a9d18765a57f1f2af551fee3af?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 6,
    				type: "track",
    				uri: "spotify:track:6re2Ni4dXwh8yHddoY9IW2"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 135473,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/1iaaZz8VUBk6LfNXO0ZTZ6"
    				},
    				href: "https://api.spotify.com/v1/tracks/1iaaZz8VUBk6LfNXO0ZTZ6",
    				id: "1iaaZz8VUBk6LfNXO0ZTZ6",
    				is_local: false,
    				name: "Fairfield",
    				preview_url: "https://p.scdn.co/mp3-preview/d85f37a0d169966524c9376e2f984730bf16f95b?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 7,
    				type: "track",
    				uri: "spotify:track:1iaaZz8VUBk6LfNXO0ZTZ6"
    			},
    			{
    				artists: [
    					{
    						external_urls: {
    							spotify: "https://open.spotify.com/artist/3D4qYDvoPn5cQxtBm4oseo"
    						},
    						href: "https://api.spotify.com/v1/artists/3D4qYDvoPn5cQxtBm4oseo",
    						id: "3D4qYDvoPn5cQxtBm4oseo",
    						name: "mewithoutYou",
    						type: "artist",
    						uri: "spotify:artist:3D4qYDvoPn5cQxtBm4oseo"
    					}
    				],
    				available_markets: [
    					"AD",
    					"AE",
    					"AG",
    					"AM",
    					"AO",
    					"AR",
    					"AT",
    					"AU",
    					"AZ",
    					"BB",
    					"BD",
    					"BE",
    					"BF",
    					"BG",
    					"BH",
    					"BI",
    					"BJ",
    					"BN",
    					"BO",
    					"BR",
    					"BS",
    					"BT",
    					"BW",
    					"BZ",
    					"CA",
    					"CG",
    					"CH",
    					"CL",
    					"CM",
    					"CO",
    					"CR",
    					"CV",
    					"CW",
    					"CY",
    					"CZ",
    					"DE",
    					"DJ",
    					"DK",
    					"DM",
    					"DO",
    					"DZ",
    					"EC",
    					"EE",
    					"EG",
    					"ES",
    					"FI",
    					"FJ",
    					"FM",
    					"FR",
    					"GA",
    					"GB",
    					"GD",
    					"GE",
    					"GH",
    					"GM",
    					"GN",
    					"GQ",
    					"GR",
    					"GT",
    					"GW",
    					"GY",
    					"HK",
    					"HN",
    					"HT",
    					"HU",
    					"ID",
    					"IE",
    					"IL",
    					"IN",
    					"IS",
    					"IT",
    					"JM",
    					"JO",
    					"JP",
    					"KE",
    					"KG",
    					"KH",
    					"KI",
    					"KM",
    					"KN",
    					"KR",
    					"KW",
    					"KZ",
    					"LA",
    					"LB",
    					"LC",
    					"LI",
    					"LK",
    					"LS",
    					"LT",
    					"LU",
    					"LV",
    					"MA",
    					"MC",
    					"MD",
    					"MG",
    					"MH",
    					"ML",
    					"MN",
    					"MO",
    					"MR",
    					"MT",
    					"MU",
    					"MV",
    					"MW",
    					"MX",
    					"MY",
    					"MZ",
    					"NA",
    					"NE",
    					"NG",
    					"NI",
    					"NL",
    					"NO",
    					"NP",
    					"NR",
    					"NZ",
    					"OM",
    					"PA",
    					"PE",
    					"PG",
    					"PH",
    					"PK",
    					"PL",
    					"PS",
    					"PT",
    					"PW",
    					"PY",
    					"QA",
    					"RO",
    					"RU",
    					"RW",
    					"SA",
    					"SB",
    					"SC",
    					"SE",
    					"SG",
    					"SI",
    					"SK",
    					"SL",
    					"SM",
    					"SN",
    					"SR",
    					"ST",
    					"SV",
    					"SZ",
    					"TD",
    					"TG",
    					"TH",
    					"TJ",
    					"TL",
    					"TN",
    					"TO",
    					"TR",
    					"TT",
    					"TV",
    					"TW",
    					"TZ",
    					"UA",
    					"UG",
    					"US",
    					"UY",
    					"UZ",
    					"VC",
    					"VE",
    					"VN",
    					"VU",
    					"WS",
    					"ZA",
    					"ZM"
    				],
    				disc_number: 1,
    				duration_ms: 208422,
    				explicit: false,
    				external_urls: {
    					spotify: "https://open.spotify.com/track/4eEZc0y3zocG67onu52nv8"
    				},
    				href: "https://api.spotify.com/v1/tracks/4eEZc0y3zocG67onu52nv8",
    				id: "4eEZc0y3zocG67onu52nv8",
    				is_local: false,
    				name: "Red Cow (Golden Calf Version)",
    				preview_url: "https://p.scdn.co/mp3-preview/ab58409b08dd13d7396a0a6edc89011552283fb0?cid=774b29d4f13844c495f206cafdad9c86",
    				track_number: 8,
    				type: "track",
    				uri: "spotify:track:4eEZc0y3zocG67onu52nv8"
    			}
    		]
    	}
    ];

    var setlists = [
    	{
    		$: {
    			id: "4b8cbf46",
    			versionId: "g2bdd30e2",
    			eventDate: "15-08-2021",
    			lastUpdated: "2021-08-16T02:19:41.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd7e1be",
    					name: "Union Transfer"
    				},
    				city: [
    					{
    						$: {
    							id: "4560349",
    							name: "Philadelphia",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.952335",
    									long: "-75.163789"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/union-transfer-philadelphia-pa-usa-bd7e1be.html"
    				]
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						song: [
    							{
    								$: {
    									name: "Cattail Down"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"\"Brother, Sister 15th Anniversary\" concert. Livestreamed on Dreamstage."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/union-transfer-philadelphia-pa-4b8cbf46.html"
    		]
    	},
    	{
    		$: {
    			id: "b8f45d2",
    			versionId: "g23ddc4af",
    			eventDate: "14-08-2021",
    			lastUpdated: "2021-08-15T02:12:43.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd7e1be",
    					name: "Union Transfer"
    				},
    				city: [
    					{
    						$: {
    							id: "4560349",
    							name: "Philadelphia",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.952335",
    									long: "-75.163789"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/union-transfer-philadelphia-pa-usa-bd7e1be.html"
    				]
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Dorothy"
    								}
    							},
    							{
    								$: {
    									name: "Seven Sisters"
    								}
    							},
    							{
    								$: {
    									name: "Lilac Queen"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Aaron solo; first verse only"
    								]
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Gentlemen"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Allah, Allah, Allah"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "It's the End of the World as We Know It (And I Feel Fine)"
    								},
    								cover: [
    									{
    										$: {
    											mbid: "ea4dfa26-f633-4da6-a52a-f49ea4897b58",
    											name: "R.E.M.",
    											sortName: "R.E.M.",
    											disambiguation: "Athens, US rock band"
    										},
    										url: [
    											"https://www.setlist.fm/setlists/rem-33d6b859.html"
    										]
    									}
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"\"The Beginning of the End\" concert. Livestreamed on Dreamstage."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/union-transfer-philadelphia-pa-b8f45d2.html"
    		]
    	},
    	{
    		$: {
    			id: "5b99b340",
    			versionId: "233aec07",
    			eventDate: "29-02-2020",
    			lastUpdated: "2020-05-29T21:26:38.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "5bd5c754",
    					name: "The Novo"
    				},
    				city: [
    					{
    						$: {
    							id: "5368361",
    							name: "Los Angeles",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "34.052",
    									long: "-118.244"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-novo-los-angeles-ca-usa-5bd5c754.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-novo-los-angeles-ca-5b99b340.html"
    		]
    	},
    	{
    		$: {
    			id: "2399b827",
    			versionId: "3b3aec00",
    			eventDate: "28-02-2020",
    			lastUpdated: "2020-05-29T21:26:23.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d39b95",
    					name: "Fox Theater Pomona"
    				},
    				city: [
    					{
    						$: {
    							id: "5384170",
    							name: "Pomona",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "34.0552886",
    									long: "-117.7522793"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/fox-theater-pomona-pomona-ca-usa-53d39b95.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Pale Horse"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/fox-theater-pomona-pomona-ca-2399b827.html"
    		]
    	},
    	{
    		$: {
    			id: "6398424b",
    			versionId: "333aec0d",
    			eventDate: "27-02-2020",
    			lastUpdated: "2020-05-29T21:26:04.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d4e721",
    					name: "Brooklyn Bowl"
    				},
    				city: [
    					{
    						$: {
    							id: "5506956",
    							name: "Las Vegas",
    							state: "Nevada",
    							stateCode: "NV"
    						},
    						coords: [
    							{
    								$: {
    									lat: "36.1749705",
    									long: "-115.137223"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/brooklyn-bowl-las-vegas-nv-usa-53d4e721.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/brooklyn-bowl-las-vegas-nv-6398424b.html"
    		]
    	},
    	{
    		$: {
    			id: "339850e9",
    			versionId: "3b3aec08",
    			eventDate: "25-02-2020",
    			lastUpdated: "2020-05-29T21:25:46.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d44759",
    					name: "The Observatory North Park"
    				},
    				city: [
    					{
    						$: {
    							id: "5391811",
    							name: "San Diego",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "32.7153292",
    									long: "-117.1572551"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-observatory-north-park-san-diego-ca-usa-53d44759.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-observatory-north-park-san-diego-ca-339850e9.html"
    		]
    	},
    	{
    		$: {
    			id: "3b9850f4",
    			versionId: "2b3aec0a",
    			eventDate: "24-02-2020",
    			lastUpdated: "2020-05-29T21:25:25.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "7bd63aec",
    					name: "Marquee Theatre"
    				},
    				city: [
    					{
    						$: {
    							id: "5317058",
    							name: "Tempe",
    							state: "Arizona",
    							stateCode: "AZ"
    						},
    						coords: [
    							{
    								$: {
    									lat: "33.414768",
    									long: "-111.9093095"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/marquee-theatre-tempe-az-usa-7bd63aec.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/marquee-theatre-tempe-az-3b9850f4.html"
    		]
    	},
    	{
    		$: {
    			id: "63986a77",
    			versionId: "233aec0b",
    			eventDate: "22-02-2020",
    			lastUpdated: "2020-05-29T21:25:07.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d63bd9",
    					name: "House of Blues"
    				},
    				city: [
    					{
    						$: {
    							id: "4684888",
    							name: "Dallas",
    							state: "Texas",
    							stateCode: "TX"
    						},
    						coords: [
    							{
    								$: {
    									lat: "32.7830556",
    									long: "-96.8066667"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/house-of-blues-dallas-tx-usa-53d63bd9.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/house-of-blues-dallas-tx-63986a77.html"
    		]
    	},
    	{
    		$: {
    			id: "73986a71",
    			versionId: "2b3aec16",
    			eventDate: "21-02-2020",
    			lastUpdated: "2020-05-29T21:24:48.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "7bd6220c",
    					name: "House of Blues"
    				},
    				city: [
    					{
    						$: {
    							id: "4699066",
    							name: "Houston",
    							state: "Texas",
    							stateCode: "TX"
    						},
    						coords: [
    							{
    								$: {
    									lat: "29.7632836",
    									long: "-95.3632715"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/house-of-blues-houston-tx-usa-7bd6220c.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/house-of-blues-houston-tx-73986a71.html"
    		]
    	},
    	{
    		$: {
    			id: "6b987aa2",
    			versionId: "3b3aec10",
    			eventDate: "20-02-2020",
    			lastUpdated: "2020-05-29T21:24:22.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "7bd63a94",
    					name: "Emo's"
    				},
    				city: [
    					{
    						$: {
    							id: "4671654",
    							name: "Austin",
    							state: "Texas",
    							stateCode: "TX"
    						},
    						coords: [
    							{
    								$: {
    									lat: "30.267153",
    									long: "-97.7430608"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/emos-austin-tx-usa-7bd63a94.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/emos-austin-tx-6b987aa2.html"
    		]
    	},
    	{
    		$: {
    			id: "2b987802",
    			versionId: "3b3aec1c",
    			eventDate: "18-02-2020",
    			lastUpdated: "2020-05-29T21:23:53.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "6bd75e66",
    					name: "Heaven @ The Masquerade"
    				},
    				city: [
    					{
    						$: {
    							id: "4180439",
    							name: "Atlanta",
    							state: "Georgia",
    							stateCode: "GA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "33.7489954",
    									long: "-84.3879824"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/heaven-the-masquerade-atlanta-ga-usa-6bd75e66.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/heaven-the-masquerade-atlanta-ga-2b987802.html"
    		]
    	},
    	{
    		$: {
    			id: "b981596",
    			versionId: "233aec1f",
    			eventDate: "16-02-2020",
    			lastUpdated: "2020-05-29T21:23:38.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd621ca",
    					name: "House of Blues"
    				},
    				city: [
    					{
    						$: {
    							id: "4161168",
    							name: "Lake Buena Vista",
    							state: "Florida",
    							stateCode: "FL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "28.3936186",
    									long: "-81.5386842"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/house-of-blues-lake-buena-vista-fl-usa-bd621ca.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/house-of-blues-lake-buena-vista-fl-b981596.html"
    		]
    	},
    	{
    		$: {
    			id: "13981591",
    			versionId: "3b3aec24",
    			eventDate: "15-02-2020",
    			lastUpdated: "2020-05-29T21:23:13.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "4bd2370a",
    					name: "The Senate"
    				},
    				city: [
    					{
    						$: {
    							id: "4575352",
    							name: "Columbia",
    							state: "South Carolina",
    							stateCode: "SC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "34.0007104",
    									long: "-81.0348144"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-senate-columbia-sc-usa-4bd2370a.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-senate-columbia-sc-13981591.html"
    		]
    	},
    	{
    		$: {
    			id: "63982613",
    			versionId: "233aec23",
    			eventDate: "14-02-2020",
    			lastUpdated: "2020-05-29T21:22:42.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d6c245",
    					name: "Cat's Cradle"
    				},
    				city: [
    					{
    						$: {
    							id: "4459343",
    							name: "Carrboro",
    							state: "North Carolina",
    							stateCode: "NC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "35.9101438",
    									long: "-79.0752895"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/cats-cradle-carrboro-nc-usa-73d6c245.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Blue Hen"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/cats-cradle-carrboro-nc-63982613.html"
    		]
    	},
    	{
    		$: {
    			id: "6b982e6e",
    			versionId: "2b3aec2e",
    			eventDate: "13-02-2020",
    			lastUpdated: "2020-05-29T21:22:27.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "7bd63e8c",
    					name: "The NorVa"
    				},
    				city: [
    					{
    						$: {
    							id: "4776222",
    							name: "Norfolk",
    							state: "Virginia",
    							stateCode: "VA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "36.8468146",
    									long: "-76.2852183"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-norva-norfolk-va-usa-7bd63e8c.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Son of a Widow"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-norva-norfolk-va-6b982e6e.html"
    		]
    	},
    	{
    		$: {
    			id: "73982e69",
    			versionId: "3b3aec28",
    			eventDate: "12-02-2020",
    			lastUpdated: "2020-05-29T21:22:00.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "23d61c8f",
    					name: "Rams Head Live!"
    				},
    				city: [
    					{
    						$: {
    							id: "4347778",
    							name: "Baltimore",
    							state: "Maryland",
    							stateCode: "MD"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.2903848",
    									long: "-76.6121893"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/rams-head-live-baltimore-md-usa-23d61c8f.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/rams-head-live-baltimore-md-73982e69.html"
    		]
    	},
    	{
    		$: {
    			id: "7b982e74",
    			versionId: "2b3aec2a",
    			eventDate: "11-02-2020",
    			lastUpdated: "2020-05-29T21:21:26.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d27b7b",
    					name: "Franklin Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "4560349",
    							name: "Philadelphia",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.952335",
    									long: "-75.163789"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/franklin-music-hall-philadelphia-pa-usa-43d27b7b.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/franklin-music-hall-philadelphia-pa-7b982e74.html"
    		]
    	},
    	{
    		$: {
    			id: "2b98c026",
    			versionId: "2b3aec36",
    			eventDate: "09-02-2020",
    			lastUpdated: "2020-05-29T21:21:09.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d63ae1",
    					name: "Starland Ballroom"
    				},
    				city: [
    					{
    						$: {
    							id: "5104404",
    							name: "Sayreville",
    							state: "New Jersey",
    							stateCode: "NJ"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.4592726",
    									long: "-74.3609822"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/starland-ballroom-sayreville-nj-usa-73d63ae1.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/starland-ballroom-sayreville-nj-2b98c026.html"
    		]
    	},
    	{
    		$: {
    			id: "4b98c7be",
    			versionId: "3b3aec30",
    			eventDate: "08-02-2020",
    			lastUpdated: "2020-05-29T21:20:56.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d55e25",
    					name: "Brooklyn Steel"
    				},
    				city: [
    					{
    						$: {
    							id: "5110302",
    							name: "Brooklyn",
    							state: "New York",
    							stateCode: "NY"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.65",
    									long: "-73.95"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/brooklyn-steel-brooklyn-ny-usa-73d55e25.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/brooklyn-steel-brooklyn-ny-4b98c7be.html"
    		]
    	},
    	{
    		$: {
    			id: "2398d8a3",
    			versionId: "333aec31",
    			eventDate: "07-02-2020",
    			lastUpdated: "2020-05-29T21:20:38.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d63bdd",
    					name: "The Palladium"
    				},
    				city: [
    					{
    						$: {
    							id: "4956184",
    							name: "Worcester",
    							state: "Massachusetts",
    							stateCode: "MA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "42.2625932",
    									long: "-71.8022934"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-palladium-worcester-ma-usa-53d63bdd.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-palladium-worcester-ma-2398d8a3.html"
    		]
    	},
    	{
    		$: {
    			id: "73890add",
    			versionId: "g3cf45b7",
    			eventDate: "23-03-2022",
    			lastUpdated: "2022-03-24T06:12:31.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3d47157",
    					name: "The Regent Theater"
    				},
    				city: [
    					{
    						$: {
    							id: "5368361",
    							name: "Los Angeles",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "34.052",
    									long: "-118.244"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-regent-theater-los-angeles-ca-usa-3d47157.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Goodbye, I!"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Allah, Allah, Allah"
    								},
    								info: [
    									"Unplanned; not listed on the written setlist"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/the-regent-theater-los-angeles-ca-73890add.html"
    		]
    	},
    	{
    		$: {
    			id: "1b890d4c",
    			versionId: "g3bcf5018",
    			eventDate: "22-03-2022",
    			lastUpdated: "2022-03-23T18:21:14.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "4bd4c71e",
    					name: "Great American Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "5391959",
    							name: "San Francisco",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "37.775",
    									long: "-122.419"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/great-american-music-hall-san-francisco-ca-usa-4bd4c71e.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Winter Solstice"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"Setlist incomplete."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/great-american-music-hall-san-francisco-ca-1b890d4c.html"
    		]
    	},
    	{
    		$: {
    			id: "13890d4d",
    			versionId: "g73cf6e81",
    			eventDate: "20-03-2022",
    			lastUpdated: "2022-03-22T03:18:39.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3bd440b0",
    					name: "Revolution Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "5746545",
    							name: "Portland",
    							state: "Oregon",
    							stateCode: "OR"
    						},
    						coords: [
    							{
    								$: {
    									lat: "45.5234515",
    									long: "-122.6762071"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/revolution-hall-portland-or-usa-3bd440b0.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								},
    								info: [
    									"Aaron acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Chapelcross Towns"
    								},
    								info: [
    									"Aaron acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "Allah, Allah, Allah"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/revolution-hall-portland-or-13890d4d.html"
    		]
    	},
    	{
    		$: {
    			id: "53892bc1",
    			versionId: "g53cf0779",
    			eventDate: "19-03-2022",
    			lastUpdated: "2022-03-20T18:29:34.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d4d3c9",
    					name: "Neumos"
    				},
    				city: [
    					{
    						$: {
    							id: "5809844",
    							name: "Seattle",
    							state: "Washington",
    							stateCode: "WA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "47.6062095",
    									long: "-122.3320708"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/neumos-seattle-wa-usa-53d4d3c9.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/neumos-seattle-wa-53892bc1.html"
    		]
    	},
    	{
    		$: {
    			id: "2388ac17",
    			versionId: "g7bc362d4",
    			eventDate: "13-01-2022",
    			lastUpdated: "2022-01-17T17:59:16.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d65bbf",
    					name: "Summit Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "5419384",
    							name: "Denver",
    							state: "Colorado",
    							stateCode: "CO"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.7391536",
    									long: "-104.9847034"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/summit-music-hall-denver-co-usa-43d65bbf.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Leave It There"
    								},
    								cover: [
    									{
    										$: {
    											mbid: "90470041-4438-4ea4-b3b0-ea93cf5fedf6",
    											name: "Charles Albert Tindley",
    											sortName: "Tindley, Charles Albert",
    											disambiguation: ""
    										},
    										url: [
    											"https://www.setlist.fm/setlists/charles-albert-tindley-2bd2e84e.html"
    										]
    									}
    								],
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/summit-music-hall-denver-co-2388ac17.html"
    		]
    	},
    	{
    		$: {
    			id: "7b88b274",
    			versionId: "g7bc33204",
    			eventDate: "11-01-2022",
    			lastUpdated: "2022-01-12T06:39:05.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "7bd63afc",
    					name: "Fine Line Music Cafe"
    				},
    				city: [
    					{
    						$: {
    							id: "5037649",
    							name: "Minneapolis",
    							state: "Minnesota",
    							stateCode: "MN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "44.9799654",
    									long: "-93.2638361"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/fine-line-music-cafe-minneapolis-mn-usa-7bd63afc.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "East Enders Wives"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Cattail Down"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Gentlemen"
    								},
    								info: [
    									"Unplanned; not listed on the written setlist"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"\"Fox's Dream of the Log Flume\" was listed on the written setlist, but not played due to gear issues; as a result, \"Julia (or, 'Holy to the LORD' on the Bells of Horses)\" was played instead."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/fine-line-music-cafe-minneapolis-mn-7b88b274.html"
    		]
    	},
    	{
    		$: {
    			id: "6b88baa2",
    			versionId: "g13c335f1",
    			eventDate: "10-01-2022",
    			lastUpdated: "2022-01-11T12:11:50.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "33d3b865",
    					name: "X-Ray Arcade"
    				},
    				city: [
    					{
    						$: {
    							id: "5249871",
    							name: "Cudahy",
    							state: "Wisconsin",
    							stateCode: "WI"
    						},
    						coords: [
    							{
    								$: {
    									lat: "42.959738",
    									long: "-87.861471"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/x-ray-arcade-cudahy-wi-usa-33d3b865.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "The King Beetle on a Coconut Estate"
    								},
    								info: [
    									"Fan request; Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/x-ray-arcade-cudahy-wi-6b88baa2.html"
    		]
    	},
    	{
    		$: {
    			id: "388b9f3",
    			versionId: "g13c3c1f9",
    			eventDate: "09-01-2022",
    			lastUpdated: "2022-01-10T05:15:58.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "63d6128f",
    					name: "Lincoln Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "4887398",
    							name: "Chicago",
    							state: "Illinois",
    							stateCode: "IL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "41.850033",
    									long: "-87.6500523"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/lincoln-hall-chicago-il-usa-63d6128f.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Birnam Wood"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/lincoln-hall-chicago-il-388b9f3.html"
    		]
    	},
    	{
    		$: {
    			id: "1b88b9fc",
    			versionId: "g23c3c427",
    			eventDate: "08-01-2022",
    			lastUpdated: "2022-01-10T01:48:33.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d7ea95",
    					name: "The Pyramid Scheme"
    				},
    				city: [
    					{
    						$: {
    							id: "4994358",
    							name: "Grand Rapids",
    							state: "Michigan",
    							stateCode: "MI"
    						},
    						coords: [
    							{
    								$: {
    									lat: "42.9633599",
    									long: "-85.6680863"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-pyramid-scheme-grand-rapids-mi-usa-73d7ea95.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Son of a Widow"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Kristy w/ the Sparkling Teeth"
    								},
    								info: [
    									"Live debut; Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Chapelcross Towns"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/the-pyramid-scheme-grand-rapids-mi-1b88b9fc.html"
    		]
    	},
    	{
    		$: {
    			id: "638b46f3",
    			versionId: "g33c30c15",
    			eventDate: "07-01-2022",
    			lastUpdated: "2022-01-14T16:00:43.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d77a45",
    					name: "The Loving Touch"
    				},
    				city: [
    					{
    						$: {
    							id: "4992635",
    							name: "Ferndale",
    							state: "Michigan",
    							stateCode: "MI"
    						},
    						coords: [
    							{
    								$: {
    									lat: "42.4605917",
    									long: "-83.1346478"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-loving-touch-ferndale-mi-usa-73d77a45.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Gentlemen"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2022/the-loving-touch-ferndale-mi-638b46f3.html"
    		]
    	},
    	{
    		$: {
    			id: "138bcdf9",
    			versionId: "g6bc28ec6",
    			eventDate: "14-12-2021",
    			lastUpdated: "2021-12-15T05:14:14.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "63d26a3b",
    					name: "Palladium Upstairs"
    				},
    				city: [
    					{
    						$: {
    							id: "4956184",
    							name: "Worcester",
    							state: "Massachusetts",
    							stateCode: "MA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "42.2625932",
    									long: "-71.8022934"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/palladium-upstairs-worcester-ma-usa-63d26a3b.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Bear's Vision of St. Agnes"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/palladium-upstairs-worcester-ma-138bcdf9.html"
    		]
    	},
    	{
    		$: {
    			id: "4b8bdbf6",
    			versionId: "g73c2aeb9",
    			eventDate: "12-12-2021",
    			lastUpdated: "2021-12-13T05:44:47.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3bd334b8",
    					name: "Mr. Smalls Theatre"
    				},
    				city: [
    					{
    						$: {
    							id: "5201452",
    							name: "Millvale",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.480069",
    									long: "-79.9783862"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/mr-smalls-theatre-millvale-pa-usa-3bd334b8.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Fiji Mermaid"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "D-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/mr-smalls-theatre-millvale-pa-4b8bdbf6.html"
    		]
    	},
    	{
    		$: {
    			id: "438bdbf7",
    			versionId: "g43c54313",
    			eventDate: "11-12-2021",
    			lastUpdated: "2021-12-12T04:52:33.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "33d51c09",
    					name: "The Burl"
    				},
    				city: [
    					{
    						$: {
    							id: "4297983",
    							name: "Lexington",
    							state: "Kentucky",
    							stateCode: "KY"
    						},
    						coords: [
    							{
    								$: {
    									lat: "37.9886892",
    									long: "-84.4777153"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-burl-lexington-ky-usa-33d51c09.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Goodbye, I!"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Timothy Hay"
    								}
    							},
    							{
    								$: {
    									name: "Seven Sisters"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Goodbye, I!"
    								},
    								info: [
    									"Reprise; Aaron solo acoustic"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/the-burl-lexington-ky-438bdbf7.html"
    		]
    	},
    	{
    		$: {
    			id: "338be8d5",
    			versionId: "g4bc54f42",
    			eventDate: "10-12-2021",
    			lastUpdated: "2021-12-11T11:17:46.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd62156",
    					name: "Musica"
    				},
    				city: [
    					{
    						$: {
    							id: "5145476",
    							name: "Akron",
    							state: "Ohio",
    							stateCode: "OH"
    						},
    						coords: [
    							{
    								$: {
    									lat: "41.0814447",
    									long: "-81.5190053"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/musica-akron-oh-usa-bd62156.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Dorothy"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/musica-akron-oh-338be8d5.html"
    		]
    	},
    	{
    		$: {
    			id: "2b8be8d6",
    			versionId: "g5bc33700",
    			eventDate: "09-12-2021",
    			lastUpdated: "2022-01-11T17:33:44.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3d3bde7",
    					name: "HI-FI Indy"
    				},
    				city: [
    					{
    						$: {
    							id: "4259418",
    							name: "Indianapolis",
    							state: "Indiana",
    							stateCode: "IN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.7683765",
    									long: "-86.1580423"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/hi-fi-indy-indianapolis-in-usa-3d3bde7.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Pale Horse"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "Blue Hen"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Four Fires"
    								},
    								info: [
    									"Aaron solo acoustic; first time live since 2016"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/hi-fi-indy-indianapolis-in-2b8be8d6.html"
    		]
    	},
    	{
    		$: {
    			id: "3b8be8d0",
    			versionId: "g7bc55e50",
    			eventDate: "08-12-2021",
    			lastUpdated: "2021-12-10T04:27:28.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d24be1",
    					name: "Cannery Ballroom"
    				},
    				city: [
    					{
    						$: {
    							id: "4644585",
    							name: "Nashville",
    							state: "Tennessee",
    							stateCode: "TN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "36.1658899",
    									long: "-86.7844432"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/cannery-ballroom-nashville-tn-usa-53d24be1.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Cattail Down"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Dorothy"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/cannery-ballroom-nashville-tn-3b8be8d0.html"
    		]
    	},
    	{
    		$: {
    			id: "38b8193",
    			versionId: "g7bc55e64",
    			eventDate: "07-12-2021",
    			lastUpdated: "2021-12-10T04:27:12.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "6bd75e66",
    					name: "Heaven @ The Masquerade"
    				},
    				city: [
    					{
    						$: {
    							id: "4180439",
    							name: "Atlanta",
    							state: "Georgia",
    							stateCode: "GA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "33.7489954",
    									long: "-84.3879824"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/heaven-the-masquerade-atlanta-ga-usa-6bd75e66.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "Every Thought a Thought of You"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Gentlemen"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Allah, Allah, Allah"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "2"
    						},
    						song: [
    							{
    								$: {
    									name: "January 1979"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/heaven-the-masquerade-atlanta-ga-38b8193.html"
    		]
    	},
    	{
    		$: {
    			id: "1b8b819c",
    			versionId: "g73c55e65",
    			eventDate: "06-12-2021",
    			lastUpdated: "2021-12-10T04:26:51.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "1bd635f4",
    					name: "Black Cat"
    				},
    				city: [
    					{
    						$: {
    							id: "4140963",
    							name: "Washington",
    							state: "Washington, D.C.",
    							stateCode: "DC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "38.895",
    									long: "-77.036"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/black-cat-washington-dc-usa-1bd635f4.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								},
    								info: [
    									"Acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Pale Horse"
    								}
    							},
    							{
    								$: {
    									name: "D-Minor"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "Bear's Vision of St. Agnes"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/black-cat-washington-dc-1b8b819c.html"
    		]
    	},
    	{
    		$: {
    			id: "138b819d",
    			versionId: "g73c55e61",
    			eventDate: "05-12-2021",
    			lastUpdated: "2021-12-10T04:26:18.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd7959e",
    					name: "Le Poisson Rouge"
    				},
    				city: [
    					{
    						$: {
    							id: "5128581",
    							name: "New York",
    							state: "New York",
    							stateCode: "NY"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.7142691",
    									long: "-74.0059729"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/le-poisson-rouge-new-york-ny-usa-bd7959e.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								},
    								info: [
    									"Aaron solo acoustic"
    								]
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "Silencer"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/le-poisson-rouge-new-york-ny-138b819d.html"
    		]
    	},
    	{
    		$: {
    			id: "5b8b9fa4",
    			versionId: "g7bc55e6c",
    			eventDate: "04-12-2021",
    			lastUpdated: "2021-12-10T04:25:50.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d3236d",
    					name: "Phantom Power"
    				},
    				city: [
    					{
    						$: {
    							id: "4559685",
    							name: "Millersville",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.9978764",
    									long: "-76.3541274"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/phantom-power-millersville-pa-usa-53d3236d.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "\"Brother, Sister\" 15 & 16 Year Anniversary Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						$: {
    							name: "Brother, Sister"
    						},
    						song: [
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "In a Market Dimly Lit"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					},
    					{
    						$: {
    							encore: "1"
    						},
    						song: [
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								},
    								info: [
    									"Acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								},
    								info: [
    									"Acoustic"
    								]
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "Son of a Widow"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2021/phantom-power-millersville-pa-5b8b9fa4.html"
    		]
    	},
    	{
    		$: {
    			id: "4398eb43",
    			versionId: "g7bda821c",
    			eventDate: "05-02-2020",
    			lastUpdated: "2021-08-26T22:02:07.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "2bd6d0be",
    					name: "Newport Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "4509177",
    							name: "Columbus",
    							state: "Ohio",
    							stateCode: "OH"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.9611755",
    									long: "-82.9987942"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/newport-music-hall-columbus-oh-usa-2bd6d0be.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "The King Beetle on a Coconut Estate"
    								}
    							},
    							{
    								$: {
    									name: "Winter Solstice"
    								}
    							},
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Birnam Wood"
    								}
    							},
    							{
    								$: {
    									name: "Chapelcross Towns"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"The band played a stripped down set due to their drummer, Rickie, being ill. Some songs might possibly be in the wrong order."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/newport-music-hall-columbus-oh-4398eb43.html"
    		]
    	},
    	{
    		$: {
    			id: "4b98f3ba",
    			versionId: "g63da821f",
    			eventDate: "04-02-2020",
    			lastUpdated: "2021-08-26T22:01:17.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d58fa3",
    					name: "Anthology"
    				},
    				city: [
    					{
    						$: {
    							id: "5134086",
    							name: "Rochester",
    							state: "New York",
    							stateCode: "NY"
    						},
    						coords: [
    							{
    								$: {
    									lat: "43.1547845",
    									long: "-77.6155568"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/anthology-rochester-ny-usa-43d58fa3.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Chapelcross Towns"
    								}
    							},
    							{
    								$: {
    									name: "Winter Solstice"
    								}
    							},
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								}
    							},
    							{
    								$: {
    									name: "Break on Through (to the Other Side) [Pt. Two]"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"The band played a stripped down set due to their drummer, Rickie, being ill."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/anthology-rochester-ny-4b98f3ba.html"
    		]
    	},
    	{
    		$: {
    			id: "2398f4c3",
    			versionId: "g7bda8224",
    			eventDate: "03-02-2020",
    			lastUpdated: "2021-08-26T22:00:39.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "5bd7afb0",
    					name: "Stage AE"
    				},
    				city: [
    					{
    						$: {
    							id: "5206379",
    							name: "Pittsburgh",
    							state: "Pennsylvania",
    							stateCode: "PA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.4406248",
    									long: "-79.9958864"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/stage-ae-pittsburgh-pa-usa-5bd7afb0.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Yellow Spider"
    								}
    							},
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "The Fox, the Crow, and the Cookie"
    								}
    							},
    							{
    								$: {
    									name: "Cardiff Giant"
    								}
    							},
    							{
    								$: {
    									name: "Orange Spider"
    								}
    							},
    							{
    								$: {
    									name: "August 6th"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "Brownish Spider"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"The band played a stripped down set due to their drummer, Rickie, being ill."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/stage-ae-pittsburgh-pa-2398f4c3.html"
    		]
    	},
    	{
    		$: {
    			id: "1b98891c",
    			versionId: "2b3aec3a",
    			eventDate: "31-01-2020",
    			lastUpdated: "2020-05-29T21:19:27.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "53d4875d",
    					name: "Concord Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "4887398",
    							name: "Chicago",
    							state: "Illinois",
    							stateCode: "IL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "41.850033",
    									long: "-87.6500523"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/concord-music-hall-chicago-il-usa-53d4875d.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/concord-music-hall-chicago-il-1b98891c.html"
    		]
    	},
    	{
    		$: {
    			id: "b989156",
    			versionId: "233aec3b",
    			eventDate: "30-01-2020",
    			lastUpdated: "2020-05-29T21:19:12.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "63d63af7",
    					name: "First Avenue"
    				},
    				city: [
    					{
    						$: {
    							id: "5037649",
    							name: "Minneapolis",
    							state: "Minnesota",
    							stateCode: "MN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "44.9799654",
    									long: "-93.2638361"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/first-avenue-minneapolis-mn-usa-63d63af7.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "D-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/first-avenue-minneapolis-mn-b989156.html"
    		]
    	},
    	{
    		$: {
    			id: "398a5a7",
    			versionId: "333aec45",
    			eventDate: "28-01-2020",
    			lastUpdated: "2020-05-29T21:18:53.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d65bbf",
    					name: "Summit Music Hall"
    				},
    				city: [
    					{
    						$: {
    							id: "5419384",
    							name: "Denver",
    							state: "Colorado",
    							stateCode: "CO"
    						},
    						coords: [
    							{
    								$: {
    									lat: "39.7391536",
    									long: "-104.9847034"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/summit-music-hall-denver-co-usa-43d65bbf.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Carousels"
    								},
    								info: [
    									"with alternate verses"
    								]
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/summit-music-hall-denver-co-398a5a7.html"
    		]
    	},
    	{
    		$: {
    			id: "4b98aff2",
    			versionId: "73218e0d",
    			eventDate: "27-01-2020",
    			lastUpdated: "2020-10-23T03:29:43.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "bd351ba",
    					name: "The Union Event Center"
    				},
    				city: [
    					{
    						$: {
    							id: "5780993",
    							name: "Salt Lake City",
    							state: "Utah",
    							stateCode: "UT"
    						},
    						coords: [
    							{
    								$: {
    									lat: "40.7607794",
    									long: "-111.8910474"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-union-event-center-salt-lake-city-ut-usa-bd351ba.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-union-event-center-salt-lake-city-ut-4b98aff2.html"
    		]
    	},
    	{
    		$: {
    			id: "3b98b818",
    			versionId: "3b3aec40",
    			eventDate: "25-01-2020",
    			lastUpdated: "2020-05-29T21:18:23.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d6ca9d",
    					name: "The Showbox SoDo"
    				},
    				city: [
    					{
    						$: {
    							id: "5809844",
    							name: "Seattle",
    							state: "Washington",
    							stateCode: "WA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "47.6062095",
    									long: "-122.3320708"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-showbox-sodo-seattle-wa-usa-73d6ca9d.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-showbox-sodo-seattle-wa-3b98b818.html"
    		]
    	},
    	{
    		$: {
    			id: "3398b825",
    			versionId: "233aec43",
    			eventDate: "24-01-2020",
    			lastUpdated: "2020-05-29T21:18:04.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3bd63c38",
    					name: "Roseland Theater"
    				},
    				city: [
    					{
    						$: {
    							id: "5746545",
    							name: "Portland",
    							state: "Oregon",
    							stateCode: "OR"
    						},
    						coords: [
    							{
    								$: {
    									lat: "45.5234515",
    									long: "-122.6762071"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/roseland-theater-portland-or-usa-3bd63c38.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/roseland-theater-portland-or-3398b825.html"
    		]
    	},
    	{
    		$: {
    			id: "139b4509",
    			versionId: "333aec4d",
    			eventDate: "23-01-2020",
    			lastUpdated: "2020-05-29T21:17:48.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "63d63667",
    					name: "The Warfield"
    				},
    				city: [
    					{
    						$: {
    							id: "5391959",
    							name: "San Francisco",
    							state: "California",
    							stateCode: "CA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "37.775",
    									long: "-122.419"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-warfield-san-francisco-ca-usa-63d63667.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "North American Winter Tour 2020"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2020/the-warfield-san-francisco-ca-139b4509.html"
    		]
    	},
    	{
    		$: {
    			id: "239f14d7",
    			versionId: "73020619",
    			eventDate: "25-08-2019",
    			lastUpdated: "2019-08-26T12:54:54.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "1bd2e1e8",
    					name: "The Signal"
    				},
    				city: [
    					{
    						$: {
    							id: "4612862",
    							name: "Chattanooga",
    							state: "Tennessee",
    							stateCode: "TN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "35.0456297",
    									long: "-85.3096801"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-signal-chattanooga-tn-usa-1bd2e1e8.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "August 6th"
    								}
    							},
    							{
    								$: {
    									name: "Goodbye, I!"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "The Soviet"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/the-signal-chattanooga-tn-239f14d7.html"
    		]
    	},
    	{
    		$: {
    			id: "139f1d6d",
    			versionId: "73021221",
    			eventDate: "24-08-2019",
    			lastUpdated: "2019-08-25T21:00:48.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d5bf9f",
    					name: "Saturn"
    				},
    				city: [
    					{
    						$: {
    							id: "4049979",
    							name: "Birmingham",
    							state: "Alabama",
    							stateCode: "AL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "33.5206608",
    									long: "-86.80249"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/saturn-birmingham-al-usa-43d5bf9f.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Son of a Widow"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/saturn-birmingham-al-139f1d6d.html"
    		]
    	},
    	{
    		$: {
    			id: "6b9f2ab6",
    			versionId: "g5bd0df6c",
    			eventDate: "23-08-2019",
    			lastUpdated: "2021-04-25T15:30:12.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "23d09c67",
    					name: "The Basement East"
    				},
    				city: [
    					{
    						$: {
    							id: "4644585",
    							name: "Nashville",
    							state: "Tennessee",
    							stateCode: "TN"
    						},
    						coords: [
    							{
    								$: {
    									lat: "36.1658899",
    									long: "-86.7844432"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-basement-east-nashville-tn-usa-23d09c67.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Pale Horse"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Fiji Mermaid"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Seven Sisters"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Timothy Hay"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/the-basement-east-nashville-tn-6b9f2ab6.html"
    		]
    	},
    	{
    		$: {
    			id: "6b9f323e",
    			versionId: "5b02c354",
    			eventDate: "22-08-2019",
    			lastUpdated: "2019-08-23T13:53:06.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "23d63c6b",
    					name: "Variety Playhouse"
    				},
    				city: [
    					{
    						$: {
    							id: "4180439",
    							name: "Atlanta",
    							state: "Georgia",
    							stateCode: "GA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "33.7489954",
    									long: "-84.3879824"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/variety-playhouse-atlanta-ga-usa-23d63c6b.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Torches Together"
    								}
    							},
    							{
    								$: {
    									name: "January 1979"
    								}
    							},
    							{
    								$: {
    									name: "August 6th"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Messes of Men"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/variety-playhouse-atlanta-ga-6b9f323e.html"
    		]
    	},
    	{
    		$: {
    			id: "7b9f3a38",
    			versionId: "2302d897",
    			eventDate: "21-08-2019",
    			lastUpdated: "2019-08-22T13:36:36.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3d63d9f",
    					name: "The Orange Peel"
    				},
    				city: [
    					{
    						$: {
    							id: "4453066",
    							name: "Asheville",
    							state: "North Carolina",
    							stateCode: "NC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "35.6009452",
    									long: "-82.554015"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-orange-peel-asheville-nc-usa-3d63d9f.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "Disaster Tourism"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							},
    							{
    								$: {
    									name: "All Circles"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/the-orange-peel-asheville-nc-7b9f3a38.html"
    		]
    	},
    	{
    		$: {
    			id: "3b9fc4cc",
    			versionId: "b31cd16",
    			eventDate: "19-08-2019",
    			lastUpdated: "2020-04-02T16:17:43.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "73d6c245",
    					name: "Cat's Cradle"
    				},
    				city: [
    					{
    						$: {
    							id: "4459343",
    							name: "Carrboro",
    							state: "North Carolina",
    							stateCode: "NC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "35.9101438",
    									long: "-79.0752895"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/cats-cradle-carrboro-nc-usa-73d6c245.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		info: [
    			"Setlist incomplete. Opened for Pedro the Lion."
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/cats-cradle-carrboro-nc-3b9fc4cc.html"
    		]
    	},
    	{
    		$: {
    			id: "2b9fcc0e",
    			versionId: "2b02a8ee",
    			eventDate: "18-08-2019",
    			lastUpdated: "2019-08-19T01:44:58.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3d63da3",
    					name: "Music Farm"
    				},
    				city: [
    					{
    						$: {
    							id: "4574324",
    							name: "Charleston",
    							state: "South Carolina",
    							stateCode: "SC"
    						},
    						coords: [
    							{
    								$: {
    									lat: "32.7765656",
    									long: "-79.9309216"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/music-farm-charleston-sc-usa-3d63da3.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Tie Me Up! Untie Me!"
    								}
    							},
    							{
    								$: {
    									name: "The Dryness and the Rain"
    								}
    							},
    							{
    								$: {
    									name: "February, 1878"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Magic Lantern Days"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "August 6th"
    								}
    							},
    							{
    								$: {
    									name: "Four Word Letter (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Bear's Vision of St. Agnes"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "In a Sweater Poorly Knit"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/music-farm-charleston-sc-2b9fcc0e.html"
    		]
    	},
    	{
    		$: {
    			id: "639fda93",
    			versionId: "3b02b42c",
    			eventDate: "17-08-2019",
    			lastUpdated: "2019-08-18T13:07:10.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "3bd38804",
    					name: "The Ritz Ybor"
    				},
    				city: [
    					{
    						$: {
    							id: "4174757",
    							name: "Tampa",
    							state: "Florida",
    							stateCode: "FL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "27.9475216",
    									long: "-82.4584279"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/the-ritz-ybor-tampa-fl-usa-3bd38804.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "My Exit, Unfair"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "Grist for the Malady Mill"
    								}
    							},
    							{
    								$: {
    									name: "C-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Bethlehem, WV"
    								}
    							},
    							{
    								$: {
    									name: "Fox's Dream of the Log Flume"
    								}
    							},
    							{
    								$: {
    									name: "The Sun and the Moon"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "O, Porcupine"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							},
    							{
    								$: {
    									name: "Timothy Hay"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/the-ritz-ybor-tampa-fl-639fda93.html"
    		]
    	},
    	{
    		$: {
    			id: "39fe143",
    			versionId: "5b029fa8",
    			eventDate: "16-08-2019",
    			lastUpdated: "2019-08-19T15:35:36.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "4bd38bd2",
    					name: "Revolution Live"
    				},
    				city: [
    					{
    						$: {
    							id: "4155966",
    							name: "Fort Lauderdale",
    							state: "Florida",
    							stateCode: "FL"
    						},
    						coords: [
    							{
    								$: {
    									lat: "26.1223084",
    									long: "-80.1433786"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/revolution-live-fort-lauderdale-fl-usa-4bd38bd2.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "East Enders Wives"
    								}
    							},
    							{
    								$: {
    									name: "Wolf Am I! (And Shadow)"
    								}
    							},
    							{
    								$: {
    									name: "Seven Sisters"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "D-Minor"
    								}
    							},
    							{
    								$: {
    									name: "Goodbye, I!"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Mexican War Streets"
    								}
    							},
    							{
    								$: {
    									name: "Tortoises All the Way Down"
    								}
    							},
    							{
    								$: {
    									name: "Fiji Mermaid"
    								}
    							},
    							{
    								$: {
    									name: "Winter Solstice"
    								}
    							},
    							{
    								$: {
    									name: "Red Cow"
    								}
    							},
    							{
    								$: {
    									name: "Flee, Thou Matadors!"
    								}
    							},
    							{
    								$: {
    									name: "Son of a Widow"
    								},
    								info: [
    									"with 'Julian the Onion' tease"
    								]
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/revolution-live-fort-lauderdale-fl-39fe143.html"
    		]
    	},
    	{
    		$: {
    			id: "139fed5d",
    			versionId: "63057ac3",
    			eventDate: "14-08-2019",
    			lastUpdated: "2019-08-15T12:38:09.000+0000"
    		},
    		artist: [
    			{
    				$: {
    					mbid: "759b5ff1-91fe-4ec9-b9b7-75b7b2ceb283",
    					name: "mewithoutYou",
    					sortName: "mewithoutYou",
    					disambiguation: ""
    				},
    				url: [
    					"https://www.setlist.fm/setlists/mewithoutyou-43d60b1b.html"
    				]
    			}
    		],
    		venue: [
    			{
    				$: {
    					id: "43d487f7",
    					name: "Civic Theatre"
    				},
    				city: [
    					{
    						$: {
    							id: "4335045",
    							name: "New Orleans",
    							state: "Louisiana",
    							stateCode: "LA"
    						},
    						coords: [
    							{
    								$: {
    									lat: "29.955",
    									long: "-90.075"
    								}
    							}
    						],
    						country: [
    							{
    								$: {
    									code: "US",
    									name: "United States"
    								}
    							}
    						]
    					}
    				],
    				url: [
    					"https://www.setlist.fm/venue/civic-theatre-new-orleans-la-usa-43d487f7.html"
    				]
    			}
    		],
    		tour: [
    			{
    				$: {
    					name: "[Untitled] Tour"
    				}
    			}
    		],
    		sets: [
    			{
    				set: [
    					{
    						song: [
    							{
    								$: {
    									name: "2,459 Miles"
    								}
    							},
    							{
    								$: {
    									name: "Another Head for Hydra"
    								}
    							},
    							{
    								$: {
    									name: "A Glass Can Only Spill What It Contains"
    								}
    							},
    							{
    								$: {
    									name: "Watermelon Ascot"
    								}
    							},
    							{
    								$: {
    									name: "The Angel of Death Came to David's Room"
    								}
    							},
    							{
    								$: {
    									name: "New Wine, New Skins"
    								}
    							},
    							{
    								$: {
    									name: "Leaf"
    								}
    							},
    							{
    								$: {
    									name: "Paper Hanger"
    								}
    							},
    							{
    								$: {
    									name: "Julia (or, 'Holy to the LORD' on the Bells of Horses)"
    								}
    							},
    							{
    								$: {
    									name: "Aubergine"
    								}
    							},
    							{
    								$: {
    									name: "Nine Stories"
    								}
    							},
    							{
    								$: {
    									name: "Nice and Blue (Pt. Two)"
    								}
    							},
    							{
    								$: {
    									name: "Rainbow Signs"
    								}
    							},
    							{
    								$: {
    									name: "9:27a.m., 7/29"
    								}
    							}
    						]
    					}
    				]
    			}
    		],
    		url: [
    			"https://www.setlist.fm/setlist/mewithoutyou/2019/civic-theatre-new-orleans-la-139fed5d.html"
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
    	let viz;
    	let t2;
    	let footer;
    	let div;
    	let current;
    	header = new Header({ $$inline: true });
    	intro = new Intro({ $$inline: true });

    	viz = new Viz({
    			props: { shows: /*shows*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(intro.$$.fragment);
    			t1 = space();
    			create_component(viz.$$.fragment);
    			t2 = space();
    			footer = element("footer");
    			div = element("div");
    			div.textContent = "Design and code by Jared Whalen | © 2022 Jared Whalen";
    			attr_dev(main, "id", "App");
    			add_location(main, file, 66, 0, 1566);
    			attr_dev(div, "class", "svelte-1meg51s");
    			add_location(div, file, 75, 0, 1642);
    			attr_dev(footer, "class", "svelte-1meg51s");
    			add_location(footer, file, 74, 0, 1633);
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
    			mount_component(viz, main, null);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div);
    			current = true;
    		},
    		p: noop,
    		i: function intro$1(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(intro.$$.fragment, local);
    			transition_in(viz.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(intro.$$.fragment, local);
    			transition_out(viz.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(intro);
    			destroy_component(viz);
    			if (detaching) detach_dev(t2);
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
    	discography.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    	let normalize = str => str.toLowerCase().replace("two", "2").replace(/[^a-zA-Z ]/g, "");
    	let tour = [];

    	setlists.map(d => {
    		let obj = {
    			date: d.$.eventDate,
    			venue: d.venue[0].$.name,
    			city: d.venue[0].city[0].$.name,
    			state: d.venue[0].city[0].$.stateCode,
    			setlist: []
    		};

    		d.sets[0].set.map(x => x.song.map(s => obj.setlist.push(normalize(s.$.name))));
    		tour.push(obj);
    	});

    	let shows = [];

    	tour.forEach(s => {
    		let showObj = {
    			date: s.date,
    			venue: s.venue,
    			city: s.city,
    			state: s.state,
    			setlist: []
    		};

    		let setlist = s.setlist;

    		// console.log(discography)
    		discography.map(album => {
    			let albumObj = { name: album.name, tracks: [] };

    			album.tracks.map(track => {
    				let trackObj = {
    					name: track.name,
    					preview_url: track.preview_url,
    					played: setlist.includes(normalize(track.name))
    				};

    				if (trackObj.played) {
    					trackObj.index = setlist.indexOf(normalize(track.name));
    				}

    				albumObj.tracks.push(trackObj);
    			});

    			showObj.setlist.push(albumObj);
    		});

    		shows.push(showObj);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Meta,
    		Header,
    		Intro,
    		Viz,
    		discography,
    		setlists,
    		normalize,
    		tour,
    		shows
    	});

    	$$self.$inject_state = $$props => {
    		if ("normalize" in $$props) normalize = $$props.normalize;
    		if ("tour" in $$props) tour = $$props.tour;
    		if ("shows" in $$props) $$invalidate(0, shows = $$props.shows);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [shows];
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
