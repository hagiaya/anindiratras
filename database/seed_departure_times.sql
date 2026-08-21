INSERT INTO departure_times (time_string)
VALUES
  ('08.00'), ('10.00'), ('13.00'), ('15.00'), ('17.00'), ('19.00'), ('21.00')
ON CONFLICT DO NOTHING;
