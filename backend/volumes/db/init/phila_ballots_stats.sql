create materialized view
  public.phila_ballots_stats as
select
  phila_ballots.division,
  count(*) as count
from
  phila_ballots
group by
  phila_ballots.division;