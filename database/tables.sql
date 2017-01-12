-- CLEANING UP

DROP TABLE IF EXISTS device_types, devices, mappings, settings;
DROP SEQUENCE IF EXISTS device_id_sequence, device_type_id_sequence, mapping_id_sequence, setting_id_sequence;

SET default_with_oids = false;


-- SEQUENCES

CREATE SEQUENCE device_id_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE device_type_id_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE mapping_id_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE setting_id_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



-- TABLES

CREATE TABLE device_types (
    device_type_id bigint DEFAULT nextval('device_type_id_sequence'::regclass) NOT NULL,
    name text
);

CREATE TABLE devices (
    device_id bigint DEFAULT nextval('device_id_sequence'::regclass) NOT NULL,
    device_name text,
    sigfox_device_id text,
    xi_device_id text,
    device_type_id bigint
);


CREATE TABLE mappings (
    mapping_id bigint DEFAULT nextval('mapping_id_sequence'::regclass) NOT NULL,
    json_field text,
    xi_topic text,
    time_series boolean DEFAULT false,
    category text,
    device_type_id bigint
);

CREATE TABLE settings (
    setting_id bigint DEFAULT nextval('setting_id_sequence'::regclass) NOT NULL,
    xi_account_id text,
    xi_broker_url text,
    xi_broker_port integer,
    xi_id_username text,
    xi_id_password text,
    xi_api_endpoint_id text,
    xi_api_endpoint_bp text
);



-- PRIMARY KEYS

ALTER TABLE ONLY device_types
    ADD CONSTRAINT device_types_pkey PRIMARY KEY (device_type_id);

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (device_id);

ALTER TABLE ONLY mappings
    ADD CONSTRAINT mappings_pkey PRIMARY KEY (mapping_id);

ALTER TABLE ONLY settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (setting_id);



-- FOREIGN KEYS

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_device_types_fkey FOREIGN KEY (device_type_id) REFERENCES device_types(device_type_id);

ALTER TABLE ONLY mappings
    ADD CONSTRAINT mappings_device_types_fkey FOREIGN KEY (device_type_id) REFERENCES device_types(device_type_id);



-- DEFAULT SETTINGS
INSERT INTO settings (xi_broker_url, xi_broker_port, xi_api_endpoint_id, xi_api_endpoint_bp) VALUES ('broker.xively.eu', 443, 'id.xively.eu', 'blueprint.xively.eu');