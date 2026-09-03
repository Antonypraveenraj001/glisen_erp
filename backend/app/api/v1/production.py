from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, require_role
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.production import (
    ProductionMaterialCreate,
    ProductionMaterialResponse,
    ProductionMaterialUpdate,
    ProductionOperationCreate,
    ProductionOperationResponse,
    ProductionOperationUpdate,
    ProductionOrderCreate,
    ProductionOrderDetailResponse,
    ProductionOrderResponse,
    ProductionOrderUpdate,
)
from app.services.production import ProductionService


router = APIRouter(
    prefix="/production",
    tags=["Production"],
)


PRODUCTION_ROLES = (
    "Boss",
    "Admin",
    "Production",
)


# ============================================================
# PRODUCTION ORDERS
# ============================================================

@router.post(
    "/orders",
    response_model=ProductionOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_production_order(
    production_order: ProductionOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    return service.create_production_order(
        data=production_order
    )


@router.get(
    "/orders",
    response_model=list[ProductionOrderResponse],
)
def get_production_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    return service.get_all_production_orders()


# Static routes MUST appear before the dynamic {production_order_id} route.

@router.get(
    "/orders/number/{production_number}",
    response_model=ProductionOrderResponse,
)
def get_production_order_by_number(
    production_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    production_order = service.get_production_order_by_number(
        production_number
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return production_order


@router.get(
    "/orders/proforma/{proforma_id}",
    response_model=list[ProductionOrderResponse],
)
def get_production_orders_by_proforma(
    proforma_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    return service.get_production_orders_by_proforma(
        proforma_id
    )


@router.get(
    "/orders/{production_order_id}/detail",
    response_model=ProductionOrderDetailResponse,
)
def get_production_order_detail(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    production_order = service.get_production_order_detail(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return production_order


@router.get(
    "/orders/{production_order_id}",
    response_model=ProductionOrderResponse,
)
def get_production_order(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    production_order = service.get_production_order(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return production_order


@router.put(
    "/orders/{production_order_id}",
    response_model=ProductionOrderResponse,
)
def update_production_order(
    production_order_id: int,
    production_order: ProductionOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_order = service.get_production_order(
        production_order_id
    )

    if existing_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.update_production_order(
        production_order=existing_order,
        data=production_order,
    )


@router.patch(
    "/orders/{production_order_id}/status",
    response_model=ProductionOrderResponse,
)
def update_production_order_status(
    production_order_id: int,
    status_value: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_order = service.get_production_order(
        production_order_id
    )

    if existing_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.update_production_status(
        production_order=existing_order,
        status=status_value,
    )


@router.delete(
    "/orders/{production_order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_production_order(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_order = service.get_production_order(
        production_order_id
    )

    if existing_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    service.delete_production_order(existing_order)

    return None


# ============================================================
# PRODUCTION MATERIALS
# ============================================================

@router.post(
    "/orders/{production_order_id}/materials",
    response_model=ProductionMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_production_material(
    production_order_id: int,
    material: ProductionMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    production_order = service.get_production_order(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.create_material(
        production_order_id=production_order_id,
        data=material,
    )


@router.get(
    "/orders/{production_order_id}/materials",
    response_model=list[ProductionMaterialResponse],
)
def get_production_materials(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    production_order = service.get_production_order(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.get_materials(
        production_order_id
    )


@router.put(
    "/materials/{material_id}",
    response_model=ProductionMaterialResponse,
)
def update_production_material(
    material_id: int,
    material: ProductionMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_material = service.get_material(
        material_id
    )

    if existing_material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production material not found",
        )

    return service.update_material(
        material=existing_material,
        data=material,
    )


@router.delete(
    "/materials/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_production_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_material = service.get_material(
        material_id
    )

    if existing_material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production material not found",
        )

    service.delete_material(existing_material)

    return None


# ============================================================
# PRODUCTION OPERATIONS
# ============================================================

@router.post(
    "/orders/{production_order_id}/operations",
    response_model=ProductionOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_production_operation(
    production_order_id: int,
    operation: ProductionOperationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    production_order = service.get_production_order(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.create_operation(
        production_order_id=production_order_id,
        data=operation,
    )


@router.get(
    "/orders/{production_order_id}/operations",
    response_model=list[ProductionOperationResponse],
)
def get_production_operations(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductionService(db)

    production_order = service.get_production_order(
        production_order_id
    )

    if production_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production order not found",
        )

    return service.get_operations(
        production_order_id
    )


@router.put(
    "/operations/{operation_id}",
    response_model=ProductionOperationResponse,
)
def update_production_operation(
    operation_id: int,
    operation: ProductionOperationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_operation = service.get_operation(
        operation_id
    )

    if existing_operation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production operation not found",
        )

    return service.update_operation(
        operation=existing_operation,
        data=operation,
    )


@router.delete(
    "/operations/{operation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_production_operation(
    operation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(*PRODUCTION_ROLES)
    ),
):
    service = ProductionService(db)

    existing_operation = service.get_operation(
        operation_id
    )

    if existing_operation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production operation not found",
        )

    service.delete_operation(existing_operation)

    return None