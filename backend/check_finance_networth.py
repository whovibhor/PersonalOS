import sys

# Allow "from app..." imports when run from repo root.
sys.path.append("backend")

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.finance_asset import FinanceAsset
from app.models.finance_liability import FinanceLiability


def main() -> None:
    db = SessionLocal()
    try:
        total_assets = db.execute(select(func.coalesce(func.sum(FinanceAsset.balance), 0))).scalar() or 0
        total_liabilities = db.execute(select(func.coalesce(func.sum(FinanceLiability.balance), 0))).scalar() or 0
        net_worth = total_assets - total_liabilities

        print(f"total_assets: {total_assets}")
        print(f"total_liabilities: {total_liabilities}")
        print(f"net_worth: {net_worth}")

        print("\nAssets:")
        for a in db.execute(select(FinanceAsset).order_by(FinanceAsset.id)).scalars().all():
            print(f"  {a.id}: {a.name} | balance={a.balance} | type={a.asset_type} | primary={a.is_primary}")

        print("\nLiabilities:")
        for l in db.execute(select(FinanceLiability).order_by(FinanceLiability.id)).scalars().all():
            print(f"  {l.id}: {l.name} | balance={l.balance} | type={l.liability_type}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
