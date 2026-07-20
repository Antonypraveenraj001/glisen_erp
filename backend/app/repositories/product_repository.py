from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:

    @staticmethod
    def create(
        db: Session,
        product: Product,
    ):
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        query = db.query(Product)

        if search:
            keyword = f"%{search}%"

            query = query.filter(
                or_(
                    Product.product_code.ilike(keyword),
                    Product.product_name.ilike(keyword),
                    Product.category.ilike(keyword),
                    Product.hsn_code.ilike(keyword),
                )
            )

        return (
            query.order_by(Product.product_name)
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        product_id: int,
    ):
        return (
            db.query(Product)
            .filter(
                Product.id == product_id,
                Product.is_active == True,
            )
            .first()
        )

    @staticmethod
    def get_by_product_name(
        db: Session,
        product_name: str,
    ):
        return (
            db.query(Product)
            .filter(
                Product.product_name.ilike(product_name),
                Product.is_active == True,
            )
            .first()
        )

    @staticmethod
    def get_by_hsn_code(
        db: Session,
        hsn_code: str,
    ):
        return (
            db.query(Product)
            .filter(
                Product.hsn_code == hsn_code,
                Product.is_active == True,
            )
            .first()
        )

    @staticmethod
    def get_by_name(
        db: Session,
        product_name: str,
    ):
        return (
            db.query(Product)
            .filter(
                Product.product_name.ilike(product_name),
                Product.is_active == True,
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        product: Product,
    ):
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def deactivate(
        db: Session,
        product: Product,
    ):
        product.is_active = False

        db.commit()
        db.refresh(product)

        return product

    @staticmethod
    def generate_product_code(
        db: Session,
    ):

        last_product = (
            db.query(Product)
            .order_by(
                Product.id.desc()
            )
            .first()
        )

        if last_product is None:
            return "PRD00001"

        return (
            f"PRD{last_product.id + 1:05d}"
        )