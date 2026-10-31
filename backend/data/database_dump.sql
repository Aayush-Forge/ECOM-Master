--
-- PostgreSQL database dump
--

\restrict yLVdLOjHKCxscfvmCW3ZolXsHeTSO2Zbz5fjcIgl4CHkcjcnZQIwmzH3Ij9vvEF

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_shipping_template_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_webhook_events DROP CONSTRAINT IF EXISTS "payment_webhook_events_paymentId_fkey";
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_changed_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_addresses DROP CONSTRAINT IF EXISTS order_addresses_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notification_log DROP CONSTRAINT IF EXISTS notification_log_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notification_log DROP CONSTRAINT IF EXISTS notification_log_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.company_documents DROP CONSTRAINT IF EXISTS company_documents_company_profile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clubbing_rules DROP CONSTRAINT IF EXISTS clubbing_rules_applicable_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clubbing_rule_products DROP CONSTRAINT IF EXISTS clubbing_rule_products_rule_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clubbing_rule_products DROP CONSTRAINT IF EXISTS clubbing_rule_products_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE IF EXISTS ONLY public.carts DROP CONSTRAINT IF EXISTS carts_customer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_fkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.reviews_product_id_idx;
DROP INDEX IF EXISTS public.reviews_order_id_idx;
DROP INDEX IF EXISTS public.reviews_customer_phone_idx;
DROP INDEX IF EXISTS public.reviews_customer_email_idx;
DROP INDEX IF EXISTS public.products_status_idx;
DROP INDEX IF EXISTS public.products_slug_key;
DROP INDEX IF EXISTS public.products_sku_key;
DROP INDEX IF EXISTS public.products_shipping_template_id_idx;
DROP INDEX IF EXISTS public.products_category_id_idx;
DROP INDEX IF EXISTS public.payments_razorpay_order_id_key;
DROP INDEX IF EXISTS public.payments_order_id_idx;
DROP INDEX IF EXISTS public.payment_webhook_events_razorpay_event_id_key;
DROP INDEX IF EXISTS public."payment_webhook_events_paymentId_idx";
DROP INDEX IF EXISTS public.orders_status_idx;
DROP INDEX IF EXISTS public.orders_order_number_key;
DROP INDEX IF EXISTS public.orders_customer_id_idx;
DROP INDEX IF EXISTS public.order_status_history_to_status_idx;
DROP INDEX IF EXISTS public.order_status_history_order_id_idx;
DROP INDEX IF EXISTS public.order_items_product_id_idx;
DROP INDEX IF EXISTS public.order_items_order_id_idx;
DROP INDEX IF EXISTS public.order_addresses_order_id_idx;
DROP INDEX IF EXISTS public.notification_log_user_id_idx;
DROP INDEX IF EXISTS public.notification_log_order_id_idx;
DROP INDEX IF EXISTS public.notification_log_idempotency_key_key;
DROP INDEX IF EXISTS public.email_templates_key_key;
DROP INDEX IF EXISTS public.company_documents_company_profile_id_idx;
DROP INDEX IF EXISTS public.clubbing_rules_starts_at_idx;
DROP INDEX IF EXISTS public.clubbing_rules_is_active_idx;
DROP INDEX IF EXISTS public.clubbing_rules_ends_at_idx;
DROP INDEX IF EXISTS public.clubbing_rules_code_key;
DROP INDEX IF EXISTS public.clubbing_rules_applicable_category_id_idx;
DROP INDEX IF EXISTS public.categories_slug_key;
DROP INDEX IF EXISTS public.carts_session_token_key;
DROP INDEX IF EXISTS public.carts_customer_id_idx;
DROP INDEX IF EXISTS public.cart_items_product_id_idx;
DROP INDEX IF EXISTS public.cart_items_cart_id_product_id_variation_id_key;
DROP INDEX IF EXISTS public.cart_items_cart_id_idx;
DROP INDEX IF EXISTS public.audit_logs_user_id_idx;
DROP INDEX IF EXISTS public.audit_logs_timestamp_idx;
DROP INDEX IF EXISTS public.audit_logs_entity_type_entity_id_idx;
DROP INDEX IF EXISTS public.audit_logs_action_type_idx;
DROP INDEX IF EXISTS public.addresses_user_id_idx;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.shipping_templates DROP CONSTRAINT IF EXISTS shipping_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.shipping_slabs DROP CONSTRAINT IF EXISTS shipping_slabs_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_webhook_events DROP CONSTRAINT IF EXISTS payment_webhook_events_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.order_addresses DROP CONSTRAINT IF EXISTS order_addresses_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_log DROP CONSTRAINT IF EXISTS notification_log_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.company_profiles DROP CONSTRAINT IF EXISTS company_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.company_documents DROP CONSTRAINT IF EXISTS company_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.clubbing_rules DROP CONSTRAINT IF EXISTS clubbing_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.clubbing_rule_products DROP CONSTRAINT IF EXISTS clubbing_rule_products_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.carts DROP CONSTRAINT IF EXISTS carts_pkey;
ALTER TABLE IF EXISTS ONLY public.cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.addresses DROP CONSTRAINT IF EXISTS addresses_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.shipping_templates;
DROP TABLE IF EXISTS public.shipping_slabs;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.product_sku_seq;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.payment_webhook_events;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.order_status_history;
DROP SEQUENCE IF EXISTS public.order_number_seq;
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.order_addresses;
DROP TABLE IF EXISTS public.notification_log;
DROP TABLE IF EXISTS public.email_templates;
DROP TABLE IF EXISTS public.company_profiles;
DROP TABLE IF EXISTS public.company_documents;
DROP TABLE IF EXISTS public.clubbing_rules;
DROP TABLE IF EXISTS public.clubbing_rule_products;
DROP TABLE IF EXISTS public.categories;
DROP TABLE IF EXISTS public.carts;
DROP TABLE IF EXISTS public.cart_items;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.addresses;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."ShippingRateType";
DROP TYPE IF EXISTS public."ProductType";
DROP TYPE IF EXISTS public."ProductStatus";
DROP TYPE IF EXISTS public."PaymentWebhookStatus";
DROP TYPE IF EXISTS public."PaymentStatus";
DROP TYPE IF EXISTS public."OrderStatus";
DROP TYPE IF EXISTS public."OrderAddressType";
DROP TYPE IF EXISTS public."NotificationStatus";
DROP TYPE IF EXISTS public."ClubbingRuleType";
DROP TYPE IF EXISTS public."CartStatus";
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CartStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CartStatus" AS ENUM (
    'active',
    'converted',
    'abandoned'
);


ALTER TYPE public."CartStatus" OWNER TO postgres;

--
-- Name: ClubbingRuleType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClubbingRuleType" AS ENUM (
    'fixed_price_bundle',
    'percentage_off_bundle'
);


ALTER TYPE public."ClubbingRuleType" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'sent',
    'failed'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: OrderAddressType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderAddressType" AS ENUM (
    'billing',
    'shipping'
);


ALTER TYPE public."OrderAddressType" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'cart',
    'payment_pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'CREATED',
    'AUTHORIZED',
    'CAPTURED',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: PaymentWebhookStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentWebhookStatus" AS ENUM (
    'received',
    'processed',
    'failed'
);


ALTER TYPE public."PaymentWebhookStatus" OWNER TO postgres;

--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE public."ProductStatus" OWNER TO postgres;

--
-- Name: ProductType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProductType" AS ENUM (
    'simple',
    'variable'
);


ALTER TYPE public."ProductType" OWNER TO postgres;

--
-- Name: ShippingRateType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ShippingRateType" AS ENUM (
    'weight',
    'order_value'
);


ALTER TYPE public."ShippingRateType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'admin',
    'editor',
    'read_only',
    'customer'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applied_steps_count integer DEFAULT 1 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    label text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    is_default boolean NOT NULL
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id text NOT NULL,
    user_role text NOT NULL,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    before_value jsonb,
    after_value jsonb,
    ip_address text
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variation_id text,
    quantity integer NOT NULL,
    unit_price_snapshot numeric(65,30) NOT NULL
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id uuid NOT NULL,
    customer_id uuid,
    session_token text NOT NULL,
    status public."CartStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image text,
    meta_description text,
    meta_title text
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: clubbing_rule_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clubbing_rule_products (
    rule_id uuid NOT NULL,
    product_id uuid NOT NULL
);


ALTER TABLE public.clubbing_rule_products OWNER TO postgres;

--
-- Name: clubbing_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clubbing_rules (
    id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type public."ClubbingRuleType" NOT NULL,
    required_quantity integer NOT NULL,
    fixed_price numeric(10,2),
    percentage_off numeric(5,2),
    applicable_category_id uuid,
    starts_at timestamp(3) without time zone,
    ends_at timestamp(3) without time zone,
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    code text
);


ALTER TABLE public.clubbing_rules OWNER TO postgres;

--
-- Name: company_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_documents (
    id uuid NOT NULL,
    company_profile_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_key character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_documents OWNER TO postgres;

--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_profiles (
    id uuid NOT NULL,
    legal_name character varying(255) NOT NULL,
    trade_name character varying(255),
    gstin character varying(15) NOT NULL,
    pan character varying(10),
    cin character varying(21),
    phone character varying(20) NOT NULL,
    email character varying(120) NOT NULL,
    website character varying(255),
    logo_url character varying(500),
    signature_url character varying(500),
    address_line1 character varying(255) NOT NULL,
    address_line2 character varying(255),
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    state_code character varying(5) NOT NULL,
    pincode character varying(10) NOT NULL,
    country character varying(50) DEFAULT 'India'::character varying NOT NULL,
    bank_name character varying(150),
    account_number character varying(50),
    account_holder character varying(255),
    account_type character varying(30),
    ifsc_code character varying(20),
    branch_name character varying(150),
    upi_id character varying(100),
    invoice_prefix character varying(20) DEFAULT 'INV-'::character varying NOT NULL,
    invoice_notes text,
    terms_conditions text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.company_profiles OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id uuid NOT NULL,
    key text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    variables_schema jsonb NOT NULL,
    heading text,
    intro text,
    footer text,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_log (
    id uuid NOT NULL,
    idempotency_key text NOT NULL,
    order_id uuid,
    user_id uuid,
    recipient text,
    template_key text NOT NULL,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."NotificationStatus" NOT NULL,
    error text
);


ALTER TABLE public.notification_log OWNER TO postgres;

--
-- Name: order_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_addresses (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    type public."OrderAddressType" NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL
);


ALTER TABLE public.order_addresses OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    title_snapshot text NOT NULL,
    sku_snapshot text NOT NULL,
    unit_price_snapshot numeric(65,30) NOT NULL,
    quantity integer NOT NULL,
    line_total numeric(65,30) NOT NULL,
    variant_id text,
    attributes_snapshot jsonb
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_number_seq OWNER TO postgres;

--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    from_status public."OrderStatus",
    to_status public."OrderStatus" NOT NULL,
    changed_by_id uuid,
    changed_by_system text,
    note text,
    changed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid NOT NULL,
    order_number text NOT NULL,
    customer_id uuid,
    status public."OrderStatus" NOT NULL,
    subtotal numeric(65,30) NOT NULL,
    discount_total numeric(65,30) NOT NULL,
    tax_total numeric(65,30) NOT NULL,
    shipping_total numeric(65,30) NOT NULL,
    grand_total numeric(65,30) NOT NULL,
    coupon_code text,
    email text,
    currency text DEFAULT 'INR'::text NOT NULL,
    placed_at timestamp(3) without time zone,
    updated_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tracking_url text,
    tracking_number text,
    shipping_template_name text,
    shipping_carrier text,
    shipping_snapshot jsonb,
    invoice_number text,
    shipping_label_status text DEFAULT 'pending'::text
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payment_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_webhook_events (
    id uuid NOT NULL,
    razorpay_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp(3) without time zone,
    status public."PaymentWebhookStatus" NOT NULL,
    "paymentId" uuid
);


ALTER TABLE public.payment_webhook_events OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    razorpay_order_id text NOT NULL,
    razorpay_payment_id text,
    razorpay_signature text,
    status public."PaymentStatus" DEFAULT 'CREATED'::public."PaymentStatus" NOT NULL,
    amount numeric(65,30) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    method text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: product_sku_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_sku_seq
    START WITH 10001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_sku_seq OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    sku text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    short_description text NOT NULL,
    base_price numeric(65,30) NOT NULL,
    compare_at_price numeric(65,30),
    sale_price numeric(65,30),
    weight numeric(65,30),
    length numeric(65,30),
    width numeric(65,30),
    height numeric(65,30),
    category_id uuid NOT NULL,
    status public."ProductStatus" NOT NULL,
    images text[],
    custom_fields jsonb NOT NULL,
    stock_quantity integer NOT NULL,
    product_type public."ProductType" DEFAULT 'simple'::public."ProductType" NOT NULL,
    attributes jsonb,
    variations jsonb,
    meta_title text,
    meta_description text,
    meta_keywords text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    shipping_template_id uuid
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text,
    order_id uuid,
    stars integer NOT NULL,
    description text NOT NULL,
    is_verified_buyer boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: shipping_slabs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_slabs (
    id uuid NOT NULL,
    name text NOT NULL,
    min_weight double precision NOT NULL,
    max_weight double precision NOT NULL,
    destination_region text NOT NULL,
    rate double precision NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.shipping_slabs OWNER TO postgres;

--
-- Name: shipping_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_templates (
    id uuid NOT NULL,
    name text NOT NULL,
    carrier_name text DEFAULT ''::text,
    rate_type public."ShippingRateType" DEFAULT 'order_value'::public."ShippingRateType" NOT NULL,
    slabs jsonb NOT NULL,
    free_shipping_threshold numeric(10,2),
    is_default boolean DEFAULT false NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.shipping_templates OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    role public."UserRole" DEFAULT 'customer'::public."UserRole" NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
acc38821-7465-483c-a1a3-2aedba1dbf9f	auto_applied	2026-10-31 14:37:54.180999+05:30	20261001000000_init	\N	\N	2026-10-31 14:37:54.180999+05:30	1
7ce45bd9-e2a7-4df4-a847-a97bebb46f9e	auto_applied	2026-10-31 14:37:54.183885+05:30	20261003183000_add_discount_code	\N	\N	2026-10-31 14:37:54.183885+05:30	1
fa69f107-4017-4243-ad70-be16e43a605a	auto_applied	2026-10-31 14:37:54.185033+05:30	20261007224000_add_order_tracking	\N	\N	2026-10-31 14:37:54.185033+05:30	1
d88fd6a3-6b53-49a3-b835-2a89156e3ab2	auto_applied	2026-10-31 14:37:54.186081+05:30	20261020113000_add_email_template_wording	\N	\N	2026-10-31 14:37:54.186081+05:30	1
f34bbd39-ec15-4cd1-b6a8-4ea8b3f63e80	auto_applied	2026-10-31 14:37:54.193582+05:30	20261027223000_add_shipping_module	\N	\N	2026-10-31 14:37:54.193582+05:30	1
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (id, user_id, label, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "timestamp", user_id, user_role, action_type, entity_type, entity_id, before_value, after_value, ip_address) FROM stdin;
audit_1793444801222_966t1n	2026-10-31 11:06:41.222	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": false, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:06:41.221Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793444866255_kjswro	2026-10-31 11:07:46.255	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": true, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:07:46.255Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793446524350_1aa40q	2026-10-31 11:35:24.35	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": false, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:35:24.350Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793446524359_zug9yx	2026-10-31 11:35:24.359	anonymous	unknown	clubbing_rule.delete	clubbing_rule	undefined	{"id": "undefined"}	null	::1
audit_1793446524366_bg9srd	2026-10-31 11:35:24.366	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": true, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:35:24.365Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793446544990_x5nhg5	2026-10-31 11:35:44.99	anonymous	unknown	clubbing_rule.create	clubbing_rule	test-campaign	null	{"id": "test-campaign", "name": "Test Campaign", "type": "fixed_price_bundle", "endsAt": null, "tagline": "Special Clubbing", "isActive": true, "startsAt": "2026-10-31T11:35:44.990Z", "createdAt": "2026-10-31T11:35:44.990Z", "eventName": "Test Campaign", "updatedAt": "2026-10-31T11:35:44.990Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "", "percentageOff": null, "clubbingProducts": [], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": []}	::1
audit_1793446586453_hunze5	2026-10-31 11:36:26.453	anonymous	unknown	clubbing_rule.create	clubbing_rule	navratri-mahotsav	null	{"id": "navratri-mahotsav", "name": "Navratri Mahotsav", "type": "custom_product_clubbing", "endsAt": null, "tagline": "Navratri Special", "isActive": true, "startsAt": "2026-10-31T11:36:26.453Z", "createdAt": "2026-10-31T11:36:26.453Z", "eventName": "Navratri", "updatedAt": "2026-10-31T11:36:26.453Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80", "description": "Divine 9 nights collection featuring auspicious floral fragrances and pure dhoop.", "percentageOff": null, "clubbingProducts": [{"name": "Divine Rose Incense", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 229, "originalPrice": 349, "discountPercentage": 34}, {"name": "Sacred Temple Havan Sambrani Cups", "slug": "sacred-temple-sambrani", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-005", "clubbingPrice": 279, "originalPrice": 399, "discountPercentage": 30}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", "applicableCategory": "floral", "bannerImageDesktop": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-002", "sd-005"]}	::1
audit_1793446586484_it5a8c	2026-10-31 11:36:26.484	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	navratri-mahotsav	null	{"id": "navratri-mahotsav", "name": "Navratri Mahotsav", "type": "custom_product_clubbing", "endsAt": null, "tagline": "Navratri Special", "isActive": false, "startsAt": "2026-10-31T11:36:26.453Z", "createdAt": "2026-10-31T11:36:26.453Z", "eventName": "Navratri", "updatedAt": "2026-10-31T11:36:26.484Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80", "description": "Divine 9 nights collection featuring auspicious floral fragrances and pure dhoop.", "percentageOff": null, "clubbingProducts": [{"name": "Divine Rose Incense", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 229, "originalPrice": 349, "discountPercentage": 34}, {"name": "Sacred Temple Havan Sambrani Cups", "slug": "sacred-temple-sambrani", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-005", "clubbingPrice": 279, "originalPrice": 399, "discountPercentage": 30}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", "applicableCategory": "floral", "bannerImageDesktop": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-002", "sd-005"]}	::1
audit_1793446586489_pfuep4	2026-10-31 11:36:26.489	anonymous	unknown	clubbing_rule.delete	clubbing_rule	navratri-mahotsav	{"id": "navratri-mahotsav"}	null	::1
audit_1793446586478_uel8o5	2026-10-31 11:36:26.478	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": false, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:36:26.478Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793446586492_ql9tky	2026-10-31 11:36:26.492	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": true, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:36:26.492Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793446599216_z62kud	2026-10-31 11:36:39.216	anonymous	unknown	clubbing_rule.delete	clubbing_rule	test-campaign	{"id": "test-campaign"}	null	::1
audit_1793447100268_ekcuaj	2026-10-31 11:45:00.268	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": false, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:45:00.268Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
audit_1793447124866_27bbum	2026-10-31 11:45:24.866	anonymous	unknown	clubbing_rule.toggle	clubbing_rule	diwali	null	{"id": "diwali", "name": "Diwali", "type": "custom_product_clubbing", "endsAt": "2026-11-30T23:59:59.000Z", "tagline": "Diwali Sale", "isActive": true, "startsAt": "2026-10-01T00:00:00.000Z", "createdAt": "2026-10-01T00:00:00.000Z", "eventName": "Diwali", "updatedAt": "2026-10-31T11:45:24.865Z", "fixedPrice": null, "bannerImage": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "description": "Exclusive Diwali festive clubbing collection. Hand-selected premium incense and sacred dhoop at special celebratory prices.", "percentageOff": null, "clubbingProducts": [{"name": "Royal Mysore Sandalwood", "slug": "royal-mysore-sandalwood", "image": "https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-001", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}, {"name": "Divine Rose", "slug": "divine-rose-incense", "image": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=600&q=80", "category": "Floral Notes", "productId": "sd-002", "clubbingPrice": 249, "originalPrice": 349, "discountPercentage": 29}, {"name": "Sacred Frankincense", "slug": "sacred-frankincense-incense", "image": "https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-003", "clubbingPrice": 329, "originalPrice": 449, "discountPercentage": 27}, {"name": "The Maharaja Luxury Sticks", "slug": "maharaja-luxury-sticks", "image": "https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-004", "clubbingPrice": 399, "originalPrice": 549, "discountPercentage": 27}, {"name": "The Monk Meditation Cones", "slug": "monk-meditation-cones", "image": "https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=600&q=80", "category": "Mysore Sandalwood", "productId": "sd-005", "clubbingPrice": 389, "originalPrice": 499, "discountPercentage": 22}, {"name": "Vedic Havan Sambrani Cups", "slug": "vedic-havan-sambrani-cups", "image": "https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=600&q=80", "category": "Sacred Resins", "productId": "sd-006", "clubbingPrice": 299, "originalPrice": 399, "discountPercentage": 25}], "requiredQuantity": 1, "bannerImageMobile": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=800&q=80", "applicableCategory": "all", "bannerImageDesktop": "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&w=1600&q=80", "featuredOnHomepage": true, "applicableProductIds": ["sd-001", "sd-002", "sd-003", "sd-004", "sd-005", "sd-006"]}	::1
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, cart_id, product_id, variation_id, quantity, unit_price_snapshot) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, customer_id, session_token, status, created_at, updated_at) FROM stdin;
0fa29ca1-370d-4ec8-a643-67588769732d	\N	ff03bd171b6b9f279856a1c72e86aedda18460a759241a780687ac46589eb82a	active	2026-10-31 11:41:16.389	2026-10-31 11:41:16.389
582b36ba-c45d-4d8b-9720-4efa72b299c3	\N	057569ed65e9c1293b6e3c45e9ca8253aae46add329c721017a110d98aae6004	active	2026-10-31 11:41:16.391	2026-10-31 11:41:16.391
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, parent_id, name, slug, description, image, meta_description, meta_title) FROM stdin;
5390356c-e847-44dc-94ed-de79106ddee2	\N	Incense Sticks	incense-sticks	\N	\N	\N	\N
9decdcf7-687b-4aaf-8702-ae51e4c08644	\N	Dhoop Sticks	dhoop-sticks	\N	\N	\N	\N
110f16fa-a26c-446c-b075-b8cd863b71f8	\N	Dhoop Cones	dhoop-cones	\N	\N	\N	\N
41677eb4-c57a-445e-ab08-3f8f9ef1bd93	\N	Sambrani Kits	sambrani-kits	\N	\N	\N	\N
61129f23-d897-41cc-ab56-855f9eb5360b	\N	Ritual Kit	ritual-kit	\N	\N	\N	\N
\.


--
-- Data for Name: clubbing_rule_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clubbing_rule_products (rule_id, product_id) FROM stdin;
\.


--
-- Data for Name: clubbing_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clubbing_rules (id, name, description, type, required_quantity, fixed_price, percentage_off, applicable_category_id, starts_at, ends_at, usage_limit, usage_count, is_active, created_at, updated_at, code) FROM stdin;
\.


--
-- Data for Name: company_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_documents (id, company_profile_id, title, file_url, file_key, file_name, file_size, mime_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_profiles (id, legal_name, trade_name, gstin, pan, cin, phone, email, website, logo_url, signature_url, address_line1, address_line2, city, state, state_code, pincode, country, bank_name, account_number, account_holder, account_type, ifsc_code, branch_name, upi_id, invoice_prefix, invoice_notes, terms_conditions, created_at, updated_at) FROM stdin;
e0c98eaf-5b68-4d44-bced-f4f0e2b18ab4	Sridattam Enterprises Pvt Ltd	Sridattam	29AAACS1234F1Z5	AAACS1234F	\N	+91 98450 99887	care@sridattam.com	https://sridattam.in	\N	\N	Building #45, 100 Feet Ring Road	JP Nagar 6th Phase	Bengaluru	Karnataka	29	560078	India	State Bank of India	409988776655	Sridattam Enterprises Pvt Ltd	Current	SBIN0004128	JP Nagar Branch	sridattam@sbi	SRI/26-27/	\N	\N	2026-10-31 09:23:22.535	2026-10-31 09:23:22.535
bca2e897-1164-4aa3-9bf3-af030ca857ca	Sridattam Enterprises Pvt Ltd	Sridattam	29AAACS1234F1Z5	AAACS1234F	\N	+91 98450 99887	care@sridattam.com	https://sridattam.in	\N	\N	Building #45, 100 Feet Ring Road	JP Nagar 6th Phase	Bengaluru	Karnataka	29	560078	India	State Bank of India	409988776655	Sridattam Enterprises Pvt Ltd	Current	SBIN0004128	JP Nagar Branch	sridattam@sbi	SRI/26-27/	\N	\N	2026-10-31 09:23:22.533	2026-10-31 09:23:22.533
7f69537a-4328-45a9-915b-2b4e8cbacbb5	Sridattam Enterprises Pvt Ltd	Sridattam	29AAACS1234F1Z5	AAACS1234F	\N	+91 98450 99887	care@sridattam.com	https://sridattam.in	\N	\N	Building #45, 100 Feet Ring Road	JP Nagar 6th Phase	Bengaluru	Karnataka	29	560078	India	State Bank of India	409988776655	Sridattam Enterprises Pvt Ltd	Current	SBIN0004128	JP Nagar Branch	sridattam@sbi	SRI/26-27/	\N	\N	2026-10-31 09:23:22.536	2026-10-31 09:23:22.536
bfa17ccc-af76-413d-9a37-c02425da2be8	Sridattam Enterprises Pvt Ltd	Sridattam	29AAACS1234F1Z5	AAACS1234F	\N	+91 98450 99887	care@sridattam.com	https://sridattam.in	\N	\N	Building #45, 100 Feet Ring Road	JP Nagar 6th Phase	Bengaluru	Karnataka	29	560078	India	State Bank of India	409988776655	Sridattam Enterprises Pvt Ltd	Current	SBIN0004128	JP Nagar Branch	sridattam@sbi	SRI/26-27/	\N	\N	2026-10-31 09:23:22.537	2026-10-31 09:23:22.537
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, key, subject, html_body, variables_schema, heading, intro, footer, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_log (id, idempotency_key, order_id, user_id, recipient, template_key, sent_at, status, error) FROM stdin;
\.


--
-- Data for Name: order_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_addresses (id, order_id, type, full_name, phone, address_line1, address_line2, city, state, postal_code, country) FROM stdin;
f69608b7-f89a-436c-8093-9b0546e940e7	685d8ce0-1bd9-443f-8bd4-3e5cc5b33c5e	shipping	Customer Test	9876543210	123 Temple Road	\N	Varanasi	Uttar Pradesh	221001	India
6a0b86d9-bd10-4d78-82d1-0ea2901cca16	35006ff9-129e-46c1-b45c-6abf42a48e80	shipping	Customer Test	9876543210	123 Temple Road	\N	Varanasi	Uttar Pradesh	221001	India
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, title_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total, variant_id, attributes_snapshot) FROM stdin;
b64269b5-a6bf-4f5a-8392-95256d27e8c4	685d8ce0-1bd9-443f-8bd4-3e5cc5b33c5e	0a256f5a-dd5f-4d64-8d86-d3f16f894069	Rajahmasa Royal Floral Agarbatti | Premium Incense Sticks - Pack of 100	AGB-RAJ-100	210.000000000000000000000000000000	1	210.000000000000000000000000000000	\N	\N
f06b52ad-4ab6-41ec-b362-d65e4ea37c14	35006ff9-129e-46c1-b45c-6abf42a48e80	0a256f5a-dd5f-4d64-8d86-d3f16f894069	Rajahmasa Royal Floral Agarbatti | Premium Incense Sticks - Pack of 100	AGB-RAJ-100	210.000000000000000000000000000000	1	210.000000000000000000000000000000	\N	\N
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_status_history (id, order_id, from_status, to_status, changed_by_id, changed_by_system, note, changed_at) FROM stdin;
9463940b-32ef-4be0-9d19-623612d06405	685d8ce0-1bd9-443f-8bd4-3e5cc5b33c5e	\N	paid	\N	Seeder	Order paid successfully	2026-10-31 09:12:54.577
d7b36f5d-bfee-4445-81b9-5cdacb2b036f	35006ff9-129e-46c1-b45c-6abf42a48e80	\N	payment_pending	\N	Seeder	Order placed awaiting checkout payment	2026-10-31 09:12:54.585
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, customer_id, status, subtotal, discount_total, tax_total, shipping_total, grand_total, coupon_code, email, currency, placed_at, updated_at, created_at, tracking_url, tracking_number, shipping_template_name, shipping_carrier, shipping_snapshot, invoice_number, shipping_label_status) FROM stdin;
685d8ce0-1bd9-443f-8bd4-3e5cc5b33c5e	ORD-TEST-001	f37c34a6-a382-4dfa-bbaa-d22586ffa489	paid	210.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	50.000000000000000000000000000000	260.000000000000000000000000000000	\N	\N	INR	\N	2026-10-31 09:12:54.577	2026-10-31 09:12:54.577	\N	\N	\N	\N	\N	\N	pending
35006ff9-129e-46c1-b45c-6abf42a48e80	ORD-TEST-002	f37c34a6-a382-4dfa-bbaa-d22586ffa489	payment_pending	210.000000000000000000000000000000	0.000000000000000000000000000000	0.000000000000000000000000000000	50.000000000000000000000000000000	260.000000000000000000000000000000	\N	\N	INR	\N	2026-10-31 09:12:54.585	2026-10-31 09:12:54.585	\N	\N	\N	\N	\N	\N	pending
\.


--
-- Data for Name: payment_webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_webhook_events (id, razorpay_event_id, event_type, payload, processed_at, status, "paymentId") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, status, amount, currency, method, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, sku, title, slug, description, short_description, base_price, compare_at_price, sale_price, weight, length, width, height, category_id, status, images, custom_fields, stock_quantity, product_type, attributes, variations, meta_title, meta_description, meta_keywords, version, created_at, updated_at, shipping_template_id) FROM stdin;
0a256f5a-dd5f-4d64-8d86-d3f16f894069	AGB-RAJ-100	Rajahmasa Royal Floral Agarbatti | Premium Incense Sticks - Pack of 100	rajahmasa-royal-floral-agarbatti-premium-incense-sticks-pack-of-100	<p>Named for royal passion, Rajahmasa captures a lush, romantic floral bouquet in every stick - the kind of fragrance that turns an ordinary room into something worth pausing in. Each stick is  on a low-smoke masala base, so the floral character comes through clean and full.</p><p>Why you'll love Rajahmasa: - A rich, romantic floral character, rolled by hand - Low-smoke base for a clean, even burn - Long burn time of approx. 40-45 minutes per stick - Ideal for daily pooja, evening prayers, meditation and quiet moments - A thoughtful gift for festivals, housewarmings and pooja thali sets</p><p>Pack contains 100 premium Rajahmasa incense sticks from Sridattam. Light one stick in a heat-safe holder, let it catch flame for 2-3 seconds, then gently blow out to let it smoulder. Store in a cool, dry place away from direct sunlight.</p><p>Rajahmasa - because devotion can be royal too.</p>	Rajahmasa is Sridattam's tribute to royalty and romance - a rich floral bouquet in 100  incense sticks. Low smoke, long-lasting, made for daily devotion and quiet luxury.	210.000000000000000000000000000000	\N	179.000000000000000000000000000000	\N	\N	\N	\N	5390356c-e847-44dc-94ed-de79106ddee2	active	{http://localhost:5000/uploads/products/AGB-RAJ-100.png}	{"tags": ["Agarbatti", "Floral", "Gifting", "Pooja", "Rajahmasa", "Royal", "Sridattam"], "aromaFamily": "Royal Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.526	2026-10-31 09:12:54.526	\N
73c474a9-2cae-4750-992b-e6783e89e756	AGB-KAL-100	Kalyani Serene Floral Agarbatti | Calming Incense Sticks - Pack of 100	kalyani-serene-floral-agarbatti-calming-incense-sticks-pack-of-100	<p>Kalyani means 'the one who brings auspiciousness and calm' - and that is exactly the mood this fragrance sets. A gentler, softer floral character than Rajahmasa, Kalyani is built for the moments you want your space to feel quiet, grounded and at ease.</p><p>Why you'll love Kalyani: - A soft, calming floral character designed to ease stress -  , low-smoke formula, gentle on breathing spaces - Long burn time of approx. 40-45 minutes per stick - Perfect for evening wind-down, yoga, meditation and bedrooms - A thoughtful self-care gift for friends and family</p><p>Pack contains 100 premium Kalyani incense sticks from Sridattam. Place in a heat-resistant holder, light the tip, let it flame briefly, then blow out gently to let it smoulder. Keep away from curtains and flammable material.</p><p>Kalyani - stillness, one stick at a time.</p>	Kalyani is Sridattam's fragrance for stillness - a soft, calming floral note in 100   sticks, made for evenings, meditation and quiet reset.	180.000000000000000000000000000000	\N	149.000000000000000000000000000000	\N	\N	\N	\N	5390356c-e847-44dc-94ed-de79106ddee2	active	{http://localhost:5000/uploads/products/AGB-KAL-100.png}	{"tags": ["Agarbatti", "Calming", "Floral", "Gifting", "Kalyani", "Meditation", "Sridattam"], "aromaFamily": "Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.53	2026-10-31 09:12:54.53	\N
3643bcb6-bc47-4ac5-b581-191e8b8eca82	AGB-CHA-100	Chandanavana Sacred Woody Agarbatti | Premium Incense Sticks - Pack of 100	chandanavana-sacred-woody-agarbatti-premium-incense-sticks-pack-of-100	<p>Chandanavana - 'the sacred forest' - is Sridattam's ode to centuries of temple tradition. This is our warmest, most grounding fragrance: a deep, woody character that feels immediately familiar to anyone who has grown up around Indian pooja rituals.</p><p>Why you'll love Chandanavana: - A rich, warm, woody character rooted in tradition -  , low-smoke, even-burning sticks - Long burn time of approx. 40-45 minutes per stick - Ideal for daily pooja, temple offerings, havan and festive rituals - A timeless choice for gifting on Diwali, weddings and housewarmings</p><p>Pack contains 100 premium Chandanavana incense sticks from Sridattam. Light the tip in a heat-safe holder, let it catch flame for a moment, then blow out to let it smoulder gently. Store away from moisture and direct heat.</p><p>Chandanavana - the scent tradition never let go of.</p>	Chandanavana is Sridattam's most traditional fragrance - a warm, woody note that has anchored Indian pooja rituals for generations, in 100   sticks.	180.000000000000000000000000000000	\N	149.000000000000000000000000000000	\N	\N	\N	\N	5390356c-e847-44dc-94ed-de79106ddee2	active	{http://localhost:5000/uploads/products/AGB-CHA-100.png}	{"tags": ["Agarbatti", "Chandanavana", "Pooja", "Sacred", "Sridattam", "Temple", "Woody"], "aromaFamily": "Sacred Woody"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.532	2026-10-31 09:12:54.532	\N
38ae59d5-07f4-4e54-876d-92911a5278b1	AGB-NAN-100	Nandanam Earthy Resin Agarbatti | Temple-Style Incense Sticks - Pack of 100	nandanam-earthy-resin-agarbatti-temple-style-incense-sticks-pack-of-100	<p>Nandanam draws its character from deep, earthy, resinous notes - smoky and grounding, reminiscent of the dhoop burned in temples for centuries. It's bolder and more intense than our floral or woody fragrances, built for households that want a strong, traditional atmosphere during prayer.</p><p>Why you'll love Nandanam: - A deep, smoky, earthy character inspired by traditional temple ritual -   on a low-smoke base for a strong yet clean burn - Long burn time of approx. 40-45 minutes per stick - Ideal for havan, festive pooja, and spaces that call for a stronger fragrance - A distinctive, memorable gift for those who love bold, classic ritual scents</p><p>Pack contains 100 premium Nandanam incense sticks from Sridattam. Light in a heat-resistant holder, allow a brief flame, then blow out to let it smoulder. Ensure good ventilation given its richer character.</p><p>Nandanam - for the moments that call for depth.</p>	Nandanam is Sridattam's boldest fragrance - a deep, smoky, earthy note inspired by temple ritual, in 100   sticks for a powerful pooja atmosphere.	160.000000000000000000000000000000	\N	129.000000000000000000000000000000	\N	\N	\N	\N	5390356c-e847-44dc-94ed-de79106ddee2	active	{http://localhost:5000/uploads/products/AGB-NAN-100.png}	{"tags": ["Agarbatti", "Earthy", "Havan", "Nandanam", "Resin", "Sridattam", "Temple"], "aromaFamily": "Deep Earthy-Resin"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.534	2026-10-31 09:12:54.534	\N
ede84e47-a504-4487-ae54-f31aef4cd01e	DHS-RAJ-20	Rajahmasa Bambooless Dhoop Sticks | Hexagonal Royal Floral - 20 Sticks	rajahmasa-bambooless-dhoop-sticks-hexagonal-royal-floral-20-sticks	<p>Rajahmasa Dhoop Sticks take Sridattam's signature royal floral character and intensify it in a completely bambooless format. Shaped as elegant 8-inch hexagonal sticks, they burn cleaner and release a stronger, more concentrated fragrance than a regular agarbatti.</p><p>Why you'll love this dhoop stick: - 100% bambooless - no wood core, so no wood-smoke smell - Distinctive 8-inch hexagonal shape for elegant display and even burning - Rich, romantic floral character, ideal for daily and festive pooja - Long-lasting burn perfect for extended prayer sessions - 20 sticks per pack</p><p>Place each stick upright in a heat-safe stand, light the tip, let it catch flame for a few seconds, then blow out gently to let it smoulder. Store in a cool, dry place.</p><p>A premium, bambooless Rajahmasa experience for households who love ritual with richness.</p>	Rajahmasa Dhoop Sticks bring bold, bambooless floral fragrance in a striking 8-inch hexagonal stick - 20 sticks of pure, long-burning ritual fragrance.	189.000000000000000000000000000000	\N	165.000000000000000000000000000000	\N	\N	\N	\N	9decdcf7-687b-4aaf-8702-ae51e4c08644	active	{http://localhost:5000/uploads/products/DHS-RAJ-20.png}	{"tags": ["Bambooless", "Dhoop Sticks", "Floral", "Hexagonal", "Pooja", "Rajahmasa", "Sridattam"], "aromaFamily": "Royal Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.535	2026-10-31 09:12:54.535	\N
a885718b-a4a3-4fe9-8266-763f18ae1269	DHS-KAL-20	Kalyani Bambooless Dhoop Sticks | Hexagonal Serene Floral - 20 Sticks	kalyani-bambooless-dhoop-sticks-hexagonal-serene-floral-20-sticks	<p>Kalyani Dhoop Sticks bring Sridattam's soothing, calming character into a bolder, bambooless format. Shaped as 8-inch hexagonal sticks with no wood core, they burn cleanly and release a stronger, calming aroma - ideal for evening rituals and meditation.</p><p>Why you'll love this dhoop stick: - 100% bambooless for a purer, wood-smoke-free fragrance - Elegant 8-inch hexagonal shape, even and long burning - Soft, calming floral character for stress relief and relaxation - Great for meditation corners, yoga spaces and evening pooja - 20 sticks per pack</p><p>Place upright in a heat-resistant stand, light the tip briefly, then blow out to let it smoulder. Keep away from flammable fabrics and store in a cool, dry place.</p><p>Let Kalyani Dhoop Sticks turn any room into a calm retreat.</p>	Kalyani Dhoop Sticks deliver calming floral fragrance in a bambooless 8-inch hexagonal format - 20 sticks for a deeper, more relaxing ritual.	179.000000000000000000000000000000	\N	149.000000000000000000000000000000	\N	\N	\N	\N	9decdcf7-687b-4aaf-8702-ae51e4c08644	active	{http://localhost:5000/uploads/products/DHS-KAL-20.png}	{"tags": ["Bambooless", "Calming", "Dhoop Sticks", "Floral", "Hexagonal", "Kalyani", "Sridattam"], "aromaFamily": "Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.537	2026-10-31 09:12:54.537	\N
49ec6e09-b44d-4a2a-affc-681eb55ddfd6	DHS-NAN-20	Nandanam Bambooless Dhoop Sticks | Hexagonal Earthy Resin - 20 Sticks	nandanam-bambooless-dhoop-sticks-hexagonal-earthy-resin-20-sticks	<p>Nandanam Dhoop Sticks bring the deep, resinous character of our earthiest fragrance into a bold, bambooless dhoop format. The 8-inch hexagonal sticks are built for households and temples that want an intense, traditional aroma that fills a space with reverence.</p><p>Why you'll love this dhoop stick: - 100% bambooless for a stronger, purer fragrance release - Elegant 8-inch hexagonal shape for steady, long burning - Deep, smoky, earthy character inspired by classic temple dhoop - Ideal for havan, festive pooja and larger prayer spaces - 20 sticks per pack</p><p>Place upright in a heat-safe stand, light briefly, then blow out to let it smoulder. Ensure good ventilation. Store in a cool, dry place away from sunlight.</p><p>Nandanam Dhoop Sticks bring depth and drama to your daily ritual.</p>	Nandanam Dhoop Sticks intensify Sridattam's deep, earthy-resin fragrance in a bambooless 8-inch hexagonal format - 20 sticks for a powerful, temple-style pooja atmosphere.	169.000000000000000000000000000000	\N	145.000000000000000000000000000000	\N	\N	\N	\N	9decdcf7-687b-4aaf-8702-ae51e4c08644	active	{http://localhost:5000/uploads/products/DHS-NAN-20.png}	{"tags": ["Bambooless", "Dhoop Sticks", "Earthy", "Havan", "Nandanam", "Resin", "Sridattam"], "aromaFamily": "Deep Earthy-Resin"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.539	2026-10-31 09:12:54.539	\N
a9ced27b-0ef4-4187-9753-e8564f25c723	DHS-TRI-21	Trishakthi Triple Emotion Bambooless Dhoop Sticks Combo - 21 Sticks	trishakthi-triple-emotion-bambooless-dhoop-sticks-combo-21-sticks	<p>Trishakthi - 'the power of three' - is Sridattam's combo dhoop stick pack for those who want variety without compromise. Every pack contains 7 sticks each of our three signature bambooless dhoop moods: the romantic Rajahmasa, the calming Kalyani, and the deep, grounding Nandanam - 21 hexagonal sticks in total.</p><p>Why you'll love Trishakthi: - 3 signature Sridattam moods in one pack - floral, calming and earthy - 100% bambooless, 8-inch hexagonal sticks for elegant, even burning - Perfect for households that like to match fragrance to mood or occasion - A great starter pack for first-time dhoop buyers - Makes an excellent gifting option</p><p>Place each stick upright in a heat-resistant stand, light the tip, let it flame briefly, then blow out to let it smoulder. Store in a cool, dry place.</p><p>One pack, three moods - Trishakthi lets your ritual match every occasion.</p>	Trishakthi brings together all three Sridattam emotions - Rajahmasa, Kalyani and Nandanam - in one bambooless dhoop pack. 21 hexagonal sticks, 7 of each, for a complete ritual experience.	199.000000000000000000000000000000	\N	185.000000000000000000000000000000	\N	\N	\N	\N	9decdcf7-687b-4aaf-8702-ae51e4c08644	active	{http://localhost:5000/uploads/products/DHS-TRI-21.jpg}	{"tags": ["Combo", "Dhoop Sticks", "Gifting", "Mixed", "Sridattam", "Trishakthi"], "aromaFamily": "Deep Earthy-Resin), Mixed (Royal Floral, Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.542	2026-10-31 09:12:54.542	\N
621f2117-c979-4bab-af03-588c5bd836a5	DHC-RAJ-36	Rajahmasa Royal Floral Dhoop Cones | Easy-Light Pooja Cones - Pack of 36	rajahmasa-royal-floral-dhoop-cones-easy-light-pooja-cones-pack-of-36	<p>Rajahmasa Dhoop Cones bring Sridattam's signature royal floral character into a compact, easy-to-use cone. Simply light the tip and place it on a heat-safe plate - no holder or stand needed - for a quick, fragrant burst that fills your space in minutes.</p><p>Why you'll love these dhoop cones: - Rich, romantic floral character in a convenient cone format - No holder needed - just light and place on any heatproof surface - Fast-lighting and long-lasting fragrance release - Great for quick daily pooja, home fragrance and travel pooja kits - 36 cones per box</p><p>Place the cone on a heat-resistant plate or dhoop stand, light the tip, let it catch flame for a moment, then blow out to let it smoulder. Store in a cool, dry place away from moisture.</p><p>Rajahmasa Dhoop Cones - royal fragrance, ready in seconds.</p>	Rajahmasa Dhoop Cones deliver rich floral fragrance in an easy-to-light cone form-36 cones per box for quick, mess-free daily pooja.	119.000000000000000000000000000000	\N	99.000000000000000000000000000000	\N	\N	\N	\N	110f16fa-a26c-446c-b075-b8cd863b71f8	active	{http://localhost:5000/uploads/products/DHC-RAJ-36.png}	{"tags": ["Dhoop Cones", "Floral", "Pooja", "Quick Use", "Rajahmasa", "Sridattam"], "aromaFamily": "Royal Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.543	2026-10-31 09:12:54.543	\N
b36c880e-a5d5-49e1-bbfc-5e622b6a6c4a	DHC-KAL-36	Chandanavana Floral Dhoop Cones | Easy-Light Relaxing Cones - Pack of 36	chandanavana-floral-dhoop-cones-easy-light-relaxing-cones-pack-of-36	<p>Chandanavana Dhoop Cones pack Sridattam's soothing, calming character into an easy, no-fuss cone. Just light and place - no holder required - for a fast, calming fragrance boost whenever your day needs a reset.</p><p>Why you'll love these dhoop cones: - Soft, calming floral character in a convenient cone format - No holder needed - light and place on any heatproof surface - Quick-lighting with a long, gentle fragrance release - Perfect for evening relaxation, meditation and guest-ready homes - 36 cones per box</p><p>Place on a heat-resistant plate, light the tip briefly, then blow out to let it smoulder. Store in a cool, dry place.</p><p>Kalyani Dhoop Cones - instant calm, one cone at a time.</p>	Chandanavana Dhoop Cones bring calming floral fragrance in a quick-light cone format - 36 cones per box for effortless everyday relaxation.	99.000000000000000000000000000000	\N	89.000000000000000000000000000000	\N	\N	\N	\N	110f16fa-a26c-446c-b075-b8cd863b71f8	active	{http://localhost:5000/uploads/products/DHC-KAL-36.png}	{"tags": ["Calming", "Dhoop Cones", "Floral", "Kalyani", "Quick Use", "Sridattam"], "aromaFamily": "Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.546	2026-10-31 09:12:54.546	\N
1943e298-606d-477a-8008-56d5f38ce552	DHC-TRI-36	Trishakthi Triple Emotion Dhoop Cones Combo - Pack of 36	trishakthi-triple-emotion-dhoop-cones-combo-pack-of-36	<p>Trishakthi Dhoop Cones give you the best of all three signature Sridattam moods in one box: 12 cones each of Rajahmasa, Kalyani and Nandanam - 36 cones total. Switch fragrances by mood, occasion or time of day, all without needing multiple boxes.</p><p>Why you'll love Trishakthi Dhoop Cones: - 3 signature Sridattam moods, 12 cones each, 36 cones total - No holder needed - light and place on any heatproof surface - Great for households that like variety in daily pooja - A well-rounded gifting option for festivals and housewarmings - Fast-lighting, long-lasting fragrance</p><p>Place on a heat-resistant plate, light the tip briefly, then blow out to let it smoulder. Store in a cool, dry place.</p><p>One box, three moods - Trishakthi Dhoop Cones for every mood and moment.</p>	Trishakthi Dhoop Cones combine all three Sridattam moods - Rajahmasa, Kalyani and Nandanam - 12 cones each, 36 in total, for a complete experience in one box.	119.000000000000000000000000000000	\N	109.000000000000000000000000000000	\N	\N	\N	\N	110f16fa-a26c-446c-b075-b8cd863b71f8	active	{http://localhost:5000/uploads/products/DHC-TRI-36.png}	{"tags": ["Combo", "Dhoop Cones", "Gifting", "Mixed", "Sridattam", "Trishakthi"], "aromaFamily": "Deep Earthy-Resin), Mixed (Royal Floral, Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.548	2026-10-31 09:12:54.548	\N
bfa66eec-2240-4dbd-a97f-c1b2b7c49c1e	SMB-SAN-09	Sannidya DIY Sambrani Cup Ritual Kit | Cowdung Cups + 2 Powders + Steel Holder - 9 Cups	sannidya-diy-sambrani-cup-ritual-kit-cowdung-cups-2-powders-steel-holder-9-cups	<p>Sannidya reimagines the traditional sambrani cup as a hands-on ritual. Instead of a pre-filled cup, you get empty cups handcrafted from natural cowdung and herbs, along with two distinct premium sambrani powder blends and a sturdy steel holder plate - so you can fill, pack and light your own sambrani cup exactly the way your family always has.</p><p>What's inside the Sannidya kit: - 9 empty dhoop cups made from natural cowdung and herbal blend - 2 varieties of premium sambrani powder (fill and mix as you like) - 1 steel plate holder for safe, stable burning - A genuinely interactive, first-of-its-kind DIY pooja experience from Sridattam</p><p>Why families love Sannidya: - Fill your own cup and control the intensity of fragrance - 100% natural cowdung base, no synthetic binders - A meaningful ritual activity for the whole family, especially during festivals - Reusable steel holder plate for future refills</p><p>How to use: take an empty cup, fill it with your chosen sambrani powder (or blend both for a custom fragrance), pack gently, place on the steel holder, light the top layer of powder, and let it smoulder.</p><p>Sannidya is not just a product - it is a ritual you build with your own hands.</p>	Sannidya is Sridattam's DIY sambrani cup kit - natural cowdung and herbal empty cups, 2 premium sambrani powder blends, and a steel holder plate. 9 cups per pack for a truly personal ritual.	149.000000000000000000000000000000	\N	119.000000000000000000000000000000	\N	\N	\N	\N	41677eb4-c57a-445e-ab08-3f8f9ef1bd93	active	{http://localhost:5000/uploads/products/SMB-SAN-09.png}	{"tags": ["Cow Dung", "DIY Kit", "Gifting", "Havan", "Sambrani", "Sannidya", "Sridattam"], "aromaFamily": "Sambrani (unscented category - no aroma-family label needed)"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.55	2026-10-31 09:12:54.55	\N
6829f57d-fed8-4a45-b35d-3247064d2b75	HAM-SAN-01	Sankalpa Premium Spiritual Gift Hamper | 4 Signature Moods + Dhoop + Sambrani Kit	sankalpa-premium-spiritual-gift-hamper-4-signature-moods-dhoop-sambrani-kit	<p>Sankalpa - meaning 'sacred intention' - is Sridattam's flagship gift hamper, built for the moments that deserve more than a single product. It brings together our entire fragrance universe in one premium box: every signature mood, our mixed dhoop sticks and cones, and the interactive Sannidya sambrani kit.</p><p>What's inside the Sankalpa hamper: - All 4 Sridattam signature moods - Rajahmasa, Kalyani, Chandanavana and Nandanam - 30 sticks each - Trishakthi bambooless dhoop sticks (mixed mood combo) - Trishakthi dhoop cones (mixed mood combo) - Sannidya DIY sambrani cup kit with cowdung cups, 2 sambrani powders and steel holder</p><p>Why Sankalpa makes the perfect gift: - A complete, curated fragrance journey, not just a single product - Ideal for Diwali, weddings, housewarmings, corporate gifting and return gifts - Premium presentation, ready to gift as-is - Introduces the receiver to the entire Sridattam range in one box</p><p>Sankalpa is more than a hamper - it is an invitation to bring intention, ritual and fragrance into someone's home. True to Sridattam's promise - spiritually rooted in tradition.</p>	Sankalpa is Sridattam's flagship gift hamper - all 4 signature emotions (30 sticks each), Trishakthi dhoop sticks, Trishakthi dhoop cones and a Sannidya sambrani kit, curated for festivals, weddings and corporate gifting.	699.000000000000000000000000000000	\N	549.000000000000000000000000000000	\N	\N	\N	\N	61129f23-d897-41cc-ab56-855f9eb5360b	active	{http://localhost:5000/uploads/products/HAM-SAN-01.png}	{"tags": ["Combo", "Corporate Gifting", "Festival", "Gift Hamper", "Premium", "Sankalpa", "Sridattam"], "aromaFamily": "Deep Earthy-Resin), Mixed (Royal Floral, Sacred Woody, Serene Floral"}	50	simple	\N	\N	\N	\N	\N	1	2026-10-31 09:12:54.551	2026-10-31 09:12:54.551	\N
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, product_id, customer_name, customer_email, customer_phone, order_id, stars, description, is_verified_buyer, created_at) FROM stdin;
\.


--
-- Data for Name: shipping_slabs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_slabs (id, name, min_weight, max_weight, destination_region, rate, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shipping_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_templates (id, name, carrier_name, rate_type, slabs, free_shipping_threshold, is_default, is_enabled, created_at, updated_at) FROM stdin;
2a8a7e15-643c-4417-a2d8-4ae467c8e9b8	Standard Delivery	Standard Delivery	order_value	[{"upTo": 499, "charge": 49}, {"upTo": null, "charge": 0}]	499.00	t	t	2026-10-31 14:37:54.187	2026-10-31 14:37:54.187
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, phone, password_hash, role, first_name, last_name, is_active, created_at) FROM stdin;
19c8bd4d-593d-481b-98b0-a75e833a88ed	admin@sridattam.com	\N	$2b$10$upftTznW3Nvqyfj1Q3mX6.ABSIYDGQzgr.WuqP60umKDQuco1UQgG	admin	Admin	User	t	2026-10-31 09:09:03.883
87e7764d-c0e8-4cb4-b9eb-719e201199ce	editor@sridattam.com	\N	$2b$10$upftTznW3Nvqyfj1Q3mX6.ABSIYDGQzgr.WuqP60umKDQuco1UQgG	editor	Editor	User	t	2026-10-31 09:09:03.926
5397be18-b7c9-4462-8d98-b2b99ff7dda7	read_only@sridattam.com	\N	$2b$10$upftTznW3Nvqyfj1Q3mX6.ABSIYDGQzgr.WuqP60umKDQuco1UQgG	read_only	Viewer	User	t	2026-10-31 09:09:03.928
f37c34a6-a382-4dfa-bbaa-d22586ffa489	customer@sridattam.com	\N	$2b$10$upftTznW3Nvqyfj1Q3mX6.ABSIYDGQzgr.WuqP60umKDQuco1UQgG	customer	Customer	User	t	2026-10-31 09:09:03.931
\.


--
-- Name: order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_number_seq', 1000, false);


--
-- Name: product_sku_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_sku_seq', 10001, false);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: clubbing_rule_products clubbing_rule_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubbing_rule_products
    ADD CONSTRAINT clubbing_rule_products_pkey PRIMARY KEY (rule_id, product_id);


--
-- Name: clubbing_rules clubbing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubbing_rules
    ADD CONSTRAINT clubbing_rules_pkey PRIMARY KEY (id);


--
-- Name: company_documents company_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_pkey PRIMARY KEY (id);


--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- Name: order_addresses order_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_addresses
    ADD CONSTRAINT order_addresses_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: shipping_slabs shipping_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_slabs
    ADD CONSTRAINT shipping_slabs_pkey PRIMARY KEY (id);


--
-- Name: shipping_templates shipping_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_templates
    ADD CONSTRAINT shipping_templates_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: addresses_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX addresses_user_id_idx ON public.addresses USING btree (user_id);


--
-- Name: audit_logs_action_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_action_type_idx ON public.audit_logs USING btree (action_type);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs USING btree ("timestamp");


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: cart_items_cart_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cart_items_cart_id_idx ON public.cart_items USING btree (cart_id);


--
-- Name: cart_items_cart_id_product_id_variation_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cart_items_cart_id_product_id_variation_id_key ON public.cart_items USING btree (cart_id, product_id, variation_id) NULLS NOT DISTINCT;


--
-- Name: cart_items_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cart_items_product_id_idx ON public.cart_items USING btree (product_id);


--
-- Name: carts_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carts_customer_id_idx ON public.carts USING btree (customer_id);


--
-- Name: carts_session_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX carts_session_token_key ON public.carts USING btree (session_token);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: clubbing_rules_applicable_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clubbing_rules_applicable_category_id_idx ON public.clubbing_rules USING btree (applicable_category_id);


--
-- Name: clubbing_rules_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX clubbing_rules_code_key ON public.clubbing_rules USING btree (code);


--
-- Name: clubbing_rules_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clubbing_rules_ends_at_idx ON public.clubbing_rules USING btree (ends_at);


--
-- Name: clubbing_rules_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clubbing_rules_is_active_idx ON public.clubbing_rules USING btree (is_active);


--
-- Name: clubbing_rules_starts_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clubbing_rules_starts_at_idx ON public.clubbing_rules USING btree (starts_at);


--
-- Name: company_documents_company_profile_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_documents_company_profile_id_idx ON public.company_documents USING btree (company_profile_id);


--
-- Name: email_templates_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_templates_key_key ON public.email_templates USING btree (key);


--
-- Name: notification_log_idempotency_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX notification_log_idempotency_key_key ON public.notification_log USING btree (idempotency_key);


--
-- Name: notification_log_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_log_order_id_idx ON public.notification_log USING btree (order_id);


--
-- Name: notification_log_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_log_user_id_idx ON public.notification_log USING btree (user_id);


--
-- Name: order_addresses_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_addresses_order_id_idx ON public.order_addresses USING btree (order_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);


--
-- Name: order_status_history_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_status_history_order_id_idx ON public.order_status_history USING btree (order_id);


--
-- Name: order_status_history_to_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_status_history_to_status_idx ON public.order_status_history USING btree (to_status);


--
-- Name: orders_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);


--
-- Name: orders_order_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: payment_webhook_events_paymentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "payment_webhook_events_paymentId_idx" ON public.payment_webhook_events USING btree ("paymentId");


--
-- Name: payment_webhook_events_razorpay_event_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payment_webhook_events_razorpay_event_id_key ON public.payment_webhook_events USING btree (razorpay_event_id);


--
-- Name: payments_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);


--
-- Name: payments_razorpay_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payments_razorpay_order_id_key ON public.payments USING btree (razorpay_order_id);


--
-- Name: products_category_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_category_id_idx ON public.products USING btree (category_id);


--
-- Name: products_shipping_template_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_shipping_template_id_idx ON public.products USING btree (shipping_template_id);


--
-- Name: products_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);


--
-- Name: products_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);


--
-- Name: products_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_status_idx ON public.products USING btree (status);


--
-- Name: reviews_customer_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reviews_customer_email_idx ON public.reviews USING btree (customer_email);


--
-- Name: reviews_customer_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reviews_customer_phone_idx ON public.reviews USING btree (customer_phone);


--
-- Name: reviews_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reviews_order_id_idx ON public.reviews USING btree (order_id);


--
-- Name: reviews_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reviews_product_id_idx ON public.reviews USING btree (product_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: carts carts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clubbing_rule_products clubbing_rule_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubbing_rule_products
    ADD CONSTRAINT clubbing_rule_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clubbing_rule_products clubbing_rule_products_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubbing_rule_products
    ADD CONSTRAINT clubbing_rule_products_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.clubbing_rules(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clubbing_rules clubbing_rules_applicable_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clubbing_rules
    ADD CONSTRAINT clubbing_rules_applicable_category_id_fkey FOREIGN KEY (applicable_category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_documents company_documents_company_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_documents
    ADD CONSTRAINT company_documents_company_profile_id_fkey FOREIGN KEY (company_profile_id) REFERENCES public.company_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notification_log notification_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notification_log notification_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_addresses order_addresses_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_addresses
    ADD CONSTRAINT order_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: order_status_history order_status_history_changed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_id_fkey FOREIGN KEY (changed_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_webhook_events payment_webhook_events_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT "payment_webhook_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_shipping_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_shipping_template_id_fkey FOREIGN KEY (shipping_template_id) REFERENCES public.shipping_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict yLVdLOjHKCxscfvmCW3ZolXsHeTSO2Zbz5fjcIgl4CHkcjcnZQIwmzH3Ij9vvEF

